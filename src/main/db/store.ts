import Database from 'better-sqlite3'
import { migrate, SCHEMA_VERSION } from './migrations'
import type { Group, NoteQuery, NoteSummary, NoteVersion, SearchResult, Tag } from '@shared/types'
import type { ReviewStatus, Sensitivity } from '@shared/ontology'

/** Max version snapshots retained per note. */
const VERSION_HISTORY_LIMIT = 50
/** Separator used by group_concat when aggregating tag names (unit separator). */
const SEP = ''

/**
 * Owns the SQLite app database (settings + notes index/cache + FTS5 index +
 * version history + group/tag definitions + note→tag assignment index).
 * Everything here is a rebuildable projection of the working-folder markdown
 * files — the files remain the source of truth (VISION.md §5.1a). Synchronous
 * by design (better-sqlite3).
 *
 * Note on portability: group/tag *definitions* (names, hierarchy, colors) live
 * here; note *assignments* (groupId, tag names) travel in each note's
 * frontmatter, so assignments rebuild via reconcile. Tag definitions also
 * rebuild by name; group definitions are app metadata.
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
            group_id, created_at, updated_at, last_confirmed_at)
         VALUES (@id, @ownerId, @path, @title, @sensitivity, @reviewStatus, @ontologyVersion,
                 @groupId, @createdAt, @updatedAt, @lastConfirmedAt)
         ON CONFLICT(id) DO UPDATE SET
           owner_id = excluded.owner_id,
           path = excluded.path,
           title = excluded.title,
           sensitivity = excluded.sensitivity,
           review_status = excluded.review_status,
           ontology_version = excluded.ontology_version,
           group_id = excluded.group_id,
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
        groupId: n.groupId,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        lastConfirmedAt: n.lastConfirmedAt
      })
  }

  deleteNoteIndex(id: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    this.db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(id)
    this.deleteFts(id)
  }

  listNoteIndex(): NoteSummary[] {
    const rows = this.db
      .prepare(
        `SELECT n.id, n.owner_id, n.title, n.sensitivity, n.review_status,
                n.ontology_version, n.group_id, n.created_at, n.updated_at,
                n.last_confirmed_at,
                group_concat(t.name, '${SEP}') AS tag_names
         FROM notes n
         LEFT JOIN note_tags nt ON nt.note_id = n.id
         LEFT JOIN tags t ON t.id = nt.tag_id
         GROUP BY n.id
         ORDER BY n.updated_at DESC`
      )
      .all() as Array<Record<string, string | null>>
    return rows.map(rowToSummary)
  }

  allIndexedIds(): Set<string> {
    const rows = this.db.prepare('SELECT id FROM notes').all() as Array<{ id: string }>
    return new Set(rows.map((r) => r.id))
  }

  // ---- full-text + filtered query ----------------------------------------

  setFts(id: string, title: string, body: string): void {
    this.deleteFts(id)
    this.db
      .prepare('INSERT INTO notes_fts (id, title, body) VALUES (?, ?, ?)')
      .run(id, title, body)
  }

  deleteFts(id: string): void {
    this.db.prepare('DELETE FROM notes_fts WHERE id = ?').run(id)
  }

  /**
   * Unified notes query: optional full-text term, optional group (incl.
   * descendants), optional tag set (AND). Returns list ordered by relevance
   * (with text) or recency (without).
   */
  queryNotes(filter: NoteQuery): SearchResult[] {
    const clauses: string[] = []
    const params: unknown[] = []

    const ftsMatch = filter.text && filter.text.trim() ? toFtsQuery(filter.text) : null
    let fromClause = 'FROM notes n'
    let snippetSel = "'' AS snippet"
    let orderBy = 'ORDER BY n.updated_at DESC'

    if (filter.text && filter.text.trim()) {
      if (!ftsMatch) return [] // text given but nothing searchable
      fromClause = 'FROM notes_fts JOIN notes n ON n.id = notes_fts.id'
      snippetSel = "snippet(notes_fts, 2, '', '', '…', 12) AS snippet"
      orderBy = 'ORDER BY rank'
      clauses.push('notes_fts MATCH ?')
      params.push(ftsMatch)
    }

    if (filter.groupId) {
      clauses.push(`n.group_id IN (
        WITH RECURSIVE grp(id) AS (
          SELECT ?
          UNION ALL
          SELECT g.id FROM groups g JOIN grp ON g.parent_group_id = grp.id
        )
        SELECT id FROM grp
      )`)
      params.push(filter.groupId)
    }

    if (filter.tagIds && filter.tagIds.length > 0) {
      const placeholders = filter.tagIds.map(() => '?').join(',')
      clauses.push(`n.id IN (
        SELECT note_id FROM note_tags
        WHERE tag_id IN (${placeholders})
        GROUP BY note_id HAVING COUNT(DISTINCT tag_id) = ?
      )`)
      params.push(...filter.tagIds, filter.tagIds.length)
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const sql = `SELECT n.id AS id, n.title AS title, n.updated_at AS updatedAt, ${snippetSel} ${fromClause} ${whereSql} ${orderBy} LIMIT 200`
    return this.db.prepare(sql).all(...params) as SearchResult[]
  }

  search(rawQuery: string): SearchResult[] {
    return this.queryNotes({ text: rawQuery })
  }

  // ---- version history ----------------------------------------------------

  addVersion(noteId: string, content: string, createdAt: string): NoteVersion {
    const id = crypto.randomUUID()
    this.db
      .prepare('INSERT INTO note_versions (id, note_id, content, created_at) VALUES (?, ?, ?, ?)')
      .run(id, noteId, content, createdAt)
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
    return this.db
      .prepare(
        `SELECT id, note_id AS noteId, content, created_at AS createdAt
         FROM note_versions WHERE note_id = ?
         ORDER BY created_at DESC, rowid DESC`
      )
      .all(noteId) as NoteVersion[]
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

  // ---- groups -------------------------------------------------------------

  listGroups(ownerId: string): Group[] {
    const rows = this.db
      .prepare(
        `SELECT id, owner_id AS ownerId, parent_group_id AS parentGroupId,
                name, color, created_at AS createdAt
         FROM groups WHERE owner_id = ? ORDER BY name COLLATE NOCASE`
      )
      .all(ownerId) as Group[]
    return rows
  }

  getGroup(id: string): Group | null {
    const row = this.db
      .prepare(
        `SELECT id, owner_id AS ownerId, parent_group_id AS parentGroupId,
                name, color, created_at AS createdAt
         FROM groups WHERE id = ?`
      )
      .get(id) as Group | undefined
    return row ?? null
  }

  createGroup(ownerId: string, name: string, parentGroupId: string | null, createdAt: string): Group {
    const id = crypto.randomUUID()
    this.db
      .prepare(
        `INSERT INTO groups (id, owner_id, parent_group_id, name, color, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`
      )
      .run(id, ownerId, parentGroupId, name, createdAt)
    return { id, ownerId, parentGroupId, name, color: null, createdAt }
  }

  renameGroup(id: string, name: string): void {
    this.db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name, id)
  }

  setGroupParent(id: string, parentGroupId: string | null): void {
    this.db.prepare('UPDATE groups SET parent_group_id = ? WHERE id = ?').run(parentGroupId, id)
  }

  setGroupColor(id: string, color: string | null): void {
    this.db.prepare('UPDATE groups SET color = ? WHERE id = ?').run(color, id)
  }

  /** Delete the group row and promote its children to its parent. */
  deleteGroup(id: string): void {
    const group = this.getGroup(id)
    const newParent = group ? group.parentGroupId : null
    this.db.prepare('UPDATE groups SET parent_group_id = ? WHERE parent_group_id = ?').run(newParent, id)
    this.db.prepare('DELETE FROM groups WHERE id = ?').run(id)
  }

  /** Ids of notes directly assigned to a group (not descendants). */
  noteIdsInGroup(groupId: string): string[] {
    const rows = this.db
      .prepare('SELECT id FROM notes WHERE group_id = ?')
      .all(groupId) as Array<{ id: string }>
    return rows.map((r) => r.id)
  }

  /** Would moving `id` under `newParentId` create a cycle? */
  isDescendantOf(id: string, ancestorId: string): boolean {
    let current: string | null = ancestorId
    const seen = new Set<string>()
    while (current) {
      if (current === id) return true
      if (seen.has(current)) return false
      seen.add(current)
      current = this.getGroup(current)?.parentGroupId ?? null
    }
    return false
  }

  // ---- tags ---------------------------------------------------------------

  listTags(ownerId: string): Tag[] {
    return this.db
      .prepare(
        `SELECT id, owner_id AS ownerId, name, color
         FROM tags WHERE owner_id = ? ORDER BY name COLLATE NOCASE`
      )
      .all(ownerId) as Tag[]
  }

  getTag(id: string): Tag | null {
    const row = this.db
      .prepare('SELECT id, owner_id AS ownerId, name, color FROM tags WHERE id = ?')
      .get(id) as Tag | undefined
    return row ?? null
  }

  getTagByName(ownerId: string, name: string): Tag | null {
    const row = this.db
      .prepare('SELECT id, owner_id AS ownerId, name, color FROM tags WHERE owner_id = ? AND name = ?')
      .get(ownerId, name) as Tag | undefined
    return row ?? null
  }

  getOrCreateTag(ownerId: string, name: string): Tag {
    const existing = this.getTagByName(ownerId, name)
    if (existing) return existing
    const id = crypto.randomUUID()
    this.db
      .prepare('INSERT INTO tags (id, owner_id, name, color) VALUES (?, ?, ?, NULL)')
      .run(id, ownerId, name)
    return { id, ownerId, name, color: null }
  }

  renameTag(id: string, name: string): void {
    this.db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, id)
  }

  setTagColor(id: string, color: string | null): void {
    this.db.prepare('UPDATE tags SET color = ? WHERE id = ?').run(color, id)
  }

  deleteTag(id: string): void {
    this.db.prepare('DELETE FROM note_tags WHERE tag_id = ?').run(id)
    this.db.prepare('DELETE FROM tags WHERE id = ?').run(id)
  }

  noteIdsWithTag(tagId: string): string[] {
    const rows = this.db
      .prepare('SELECT note_id FROM note_tags WHERE tag_id = ?')
      .all(tagId) as Array<{ note_id: string }>
    return rows.map((r) => r.note_id)
  }

  /** Replace a note's tag links from a list of tag names (get-or-create each). */
  syncNoteTags(ownerId: string, noteId: string, tagNames: string[]): void {
    this.db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId)
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)'
    )
    for (const raw of tagNames) {
      const name = raw.trim()
      if (!name) continue
      const tag = this.getOrCreateTag(ownerId, name)
      insert.run(noteId, tag.id)
    }
  }

  tagNamesForNote(noteId: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT t.name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
         WHERE nt.note_id = ? ORDER BY t.name COLLATE NOCASE`
      )
      .all(noteId) as Array<{ name: string }>
    return rows.map((r) => r.name)
  }
}

function rowToSummary(r: Record<string, string | null>): NoteSummary {
  const tagNames = r.tag_names
  return {
    id: r.id as string,
    ownerId: (r.owner_id as string) ?? '',
    title: (r.title as string) ?? '',
    sensitivity: (r.sensitivity as Sensitivity) ?? 'business',
    reviewStatus: (r.review_status as ReviewStatus) ?? 'accepted',
    ontologyVersion: (r.ontology_version as string) ?? '',
    groupId: (r.group_id as string | null) ?? null,
    tags: tagNames ? tagNames.split(SEP) : [],
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
