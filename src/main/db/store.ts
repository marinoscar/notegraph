import Database from 'better-sqlite3'
import { migrate, SCHEMA_VERSION } from './migrations'
import type { NoteSummary, NoteVersion, SearchResult } from '@shared/types'
import type { ReviewStatus, Sensitivity } from '@shared/ontology'

/** Max version snapshots retained per note. */
const VERSION_HISTORY_LIMIT = 50

/**
 * Owns the SQLite app database (settings + notes index/cache + FTS5 index +
 * version history). Everything here is a rebuildable projection of the
 * working-folder markdown files — the files remain the source of truth
 * (VISION.md §5.1a). Synchronous by design (better-sqlite3).
 */
export class Store {
  private readonly db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    migrate(this.db)
  }

  get schemaVersion(): number {
    return SCHEMA_VERSION
  }

  close(): void {
    this.db.close()
  }

  // ---- settings -----------------------------------------------------------

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row ? row.value : null
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(key, value)
  }

  // ---- notes index --------------------------------------------------------

  upsertNoteIndex(n: NoteSummary & { path: string }): void {
    this.db
      .prepare(
        `INSERT INTO notes
           (id, owner_id, path, title, sensitivity, review_status, ontology_version,
            created_at, updated_at, last_confirmed_at)
         VALUES (@id, @ownerId, @path, @title, @sensitivity, @reviewStatus, @ontologyVersion,
                 @createdAt, @updatedAt, @lastConfirmedAt)
         ON CONFLICT(id) DO UPDATE SET
           owner_id = excluded.owner_id,
           path = excluded.path,
           title = excluded.title,
           sensitivity = excluded.sensitivity,
           review_status = excluded.review_status,
           ontology_version = excluded.ontology_version,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           last_confirmed_at = excluded.last_confirmed_at`
      )
      .run({
        id: n.id,
        ownerId: n.ownerId,
        path: n.path,
        title: n.title,
        sensitivity: n.sensitivity,
        reviewStatus: n.reviewStatus,
        ontologyVersion: n.ontologyVersion,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        lastConfirmedAt: n.lastConfirmedAt
      })
  }

  deleteNoteIndex(id: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    this.deleteFts(id)
  }

  listNoteIndex(): NoteSummary[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, sensitivity, review_status, ontology_version,
                created_at, updated_at, last_confirmed_at, owner_id
         FROM notes ORDER BY updated_at DESC`
      )
      .all() as Array<Record<string, string | null>>
    return rows.map(rowToSummary)
  }

  allIndexedIds(): Set<string> {
    const rows = this.db.prepare('SELECT id FROM notes').all() as Array<{ id: string }>
    return new Set(rows.map((r) => r.id))
  }

  // ---- full-text search (FTS5) -------------------------------------------

  setFts(id: string, title: string, body: string): void {
    this.deleteFts(id)
    this.db
      .prepare('INSERT INTO notes_fts (id, title, body) VALUES (?, ?, ?)')
      .run(id, title, body)
  }

  deleteFts(id: string): void {
    this.db.prepare('DELETE FROM notes_fts WHERE id = ?').run(id)
  }

  search(rawQuery: string): SearchResult[] {
    const match = toFtsQuery(rawQuery)
    if (!match) return []
    const rows = this.db
      .prepare(
        `SELECT id,
                title,
                snippet(notes_fts, 2, '', '', '…', 12) AS snippet
         FROM notes_fts
         WHERE notes_fts MATCH ?
         ORDER BY rank
         LIMIT 50`
      )
      .all(match) as Array<{ id: string; title: string; snippet: string }>
    return rows
  }

  // ---- version history ----------------------------------------------------

  addVersion(noteId: string, content: string, createdAt: string): NoteVersion {
    const id = crypto.randomUUID()
    this.db
      .prepare('INSERT INTO note_versions (id, note_id, content, created_at) VALUES (?, ?, ?, ?)')
      .run(id, noteId, content, createdAt)
    // Prune to the newest VERSION_HISTORY_LIMIT snapshots for this note.
    this.db
      .prepare(
        `DELETE FROM note_versions
         WHERE note_id = ?
           AND id NOT IN (
             SELECT id FROM note_versions
             WHERE note_id = ?
             ORDER BY created_at DESC, rowid DESC
             LIMIT ?
           )`
      )
      .run(noteId, noteId, VERSION_HISTORY_LIMIT)
    return { id, noteId, content, createdAt }
  }

  listVersions(noteId: string): NoteVersion[] {
    const rows = this.db
      .prepare(
        `SELECT id, note_id AS noteId, content, created_at AS createdAt
         FROM note_versions WHERE note_id = ?
         ORDER BY created_at DESC, rowid DESC`
      )
      .all(noteId) as NoteVersion[]
    return rows
  }

  getVersion(versionId: string): NoteVersion | null {
    const row = this.db
      .prepare(
        `SELECT id, note_id AS noteId, content, created_at AS createdAt
         FROM note_versions WHERE id = ?`
      )
      .get(versionId) as NoteVersion | undefined
    return row ?? null
  }

  deleteVersionsFor(noteId: string): void {
    this.db.prepare('DELETE FROM note_versions WHERE note_id = ?').run(noteId)
  }
}

function rowToSummary(r: Record<string, string | null>): NoteSummary {
  return {
    id: r.id as string,
    ownerId: (r.owner_id as string) ?? '',
    title: (r.title as string) ?? '',
    sensitivity: (r.sensitivity as Sensitivity) ?? 'business',
    reviewStatus: (r.review_status as ReviewStatus) ?? 'accepted',
    ontologyVersion: (r.ontology_version as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
    lastConfirmedAt: (r.last_confirmed_at as string) ?? null
  }
}

/**
 * Turn arbitrary user text into a safe FTS5 prefix query. Each token is
 * reduced to letters/digits and turned into a prefix term joined by AND.
 * Returns null when there is nothing searchable.
 */
export function toFtsQuery(text: string): string | null {
  const tokens = text
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length > 0)
  if (tokens.length === 0) return null
  return tokens.map((t) => `${t}*`).join(' ')
}
