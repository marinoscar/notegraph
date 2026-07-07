import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import type { Store } from '../db/store'
import type { Note, NoteSummary, NoteVersion, SearchResult, NoteSaveInput, NoteQuery } from '@shared/types'
import {
  ONTOLOGY_VERSION,
  DEFAULT_NOTE_REVIEW_STATUS,
  DEFAULT_NOTE_SENSITIVITY
} from '@shared/ontology'

/** Only snapshot a new version if the latest is older than this (ms). */
const VERSION_THROTTLE_MS = 2 * 60 * 1000

const isoOrNull = z
  .union([z.string(), z.date()])
  .nullable()
  .optional()
  .transform((v) => (v instanceof Date ? v.toISOString() : (v ?? null)))

const isoString = z
  .union([z.string(), z.date()])
  .optional()
  .transform((v) => (v instanceof Date ? v.toISOString() : v))

/** Tolerant frontmatter parser: hand-edited files still load, with defaults. */
const frontmatterSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string().optional(),
  ontologyVersion: z.string().optional(),
  title: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v == null ? undefined : String(v))),
  reviewStatus: z.string().optional(),
  sensitivity: z.string().optional(),
  groupId: z.string().nullable().optional(),
  tags: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .transform((arr) => (arr ? arr.map((t) => String(t).trim()).filter(Boolean) : [])),
  createdAt: isoString,
  updatedAt: isoString,
  lastConfirmedAt: isoOrNull
})

/**
 * Notes are markdown files with YAML frontmatter in `<workingFolder>/notes/`.
 * The files are the source of truth; the SQLite Store holds a rebuildable
 * index + FTS + version history + tag-assignment index (VISION.md §4.1, §5.1a).
 */
export class NoteService {
  private readonly notesDir: string

  constructor(
    private readonly store: Store,
    private readonly ownerId: string,
    workingFolderPath: string
  ) {
    this.notesDir = path.join(workingFolderPath, 'notes')
  }

  async init(): Promise<void> {
    await fs.mkdir(this.notesDir, { recursive: true })
    await this.reconcile()
  }

  private filePath(id: string): string {
    return path.join(this.notesDir, `${id}.md`)
  }

  private serialize(note: Note): string {
    const { body, ...fm } = note
    return matter.stringify(body, fm)
  }

  private summaryOf(note: Note, filePath: string): NoteSummary & { path: string } {
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    const { body: _body, ...summary } = note
    return { ...summary, path: filePath }
  }

  private parse(id: string, raw: string): Note {
    const parsed = matter(raw)
    const fm = frontmatterSchema.parse(parsed.data)
    const now = new Date().toISOString()
    return {
      id: fm.id || id,
      ownerId: fm.ownerId || this.ownerId,
      ontologyVersion: fm.ontologyVersion || ONTOLOGY_VERSION,
      title: fm.title || 'Untitled',
      reviewStatus: (fm.reviewStatus as Note['reviewStatus']) || DEFAULT_NOTE_REVIEW_STATUS,
      sensitivity: (fm.sensitivity as Note['sensitivity']) || DEFAULT_NOTE_SENSITIVITY,
      groupId: fm.groupId ?? null,
      tags: fm.tags ?? [],
      createdAt: fm.createdAt || now,
      updatedAt: fm.updatedAt || now,
      lastConfirmedAt: fm.lastConfirmedAt,
      body: parsed.content.replace(/^\n/, '')
    }
  }

  /** Persist a full note: write the file and refresh all SQLite indexes. */
  private async write(note: Note, opts: { snapshot: boolean }): Promise<Note> {
    const fp = this.filePath(note.id)
    await fs.writeFile(fp, this.serialize(note), 'utf8')
    this.store.upsertNoteIndex(this.summaryOf(note, fp))
    this.store.setFts(note.id, note.title, note.body)
    this.store.syncNoteTags(this.ownerId, note.id, note.tags)
    if (opts.snapshot) this.maybeSnapshot(note)
    return note
  }

  async create(groupId: string | null = null): Promise<Note> {
    const now = new Date().toISOString()
    const note: Note = {
      id: crypto.randomUUID(),
      ownerId: this.ownerId,
      ontologyVersion: ONTOLOGY_VERSION,
      title: 'Untitled',
      reviewStatus: DEFAULT_NOTE_REVIEW_STATUS,
      sensitivity: DEFAULT_NOTE_SENSITIVITY,
      groupId,
      tags: [],
      createdAt: now,
      updatedAt: now,
      lastConfirmedAt: null,
      body: ''
    }
    return this.write(note, { snapshot: false })
  }

  async get(id: string): Promise<Note | null> {
    try {
      const raw = await fs.readFile(this.filePath(id), 'utf8')
      return this.parse(id, raw)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw err
    }
  }

  async save(id: string, input: NoteSaveInput): Promise<Note> {
    const existing = await this.get(id)
    const now = new Date().toISOString()
    const note: Note = existing
      ? { ...existing, title: input.title || 'Untitled', body: input.body, updatedAt: now }
      : {
          id,
          ownerId: this.ownerId,
          ontologyVersion: ONTOLOGY_VERSION,
          title: input.title || 'Untitled',
          reviewStatus: DEFAULT_NOTE_REVIEW_STATUS,
          sensitivity: DEFAULT_NOTE_SENSITIVITY,
          groupId: null,
          tags: [],
          createdAt: now,
          updatedAt: now,
          lastConfirmedAt: null,
          body: input.body
        }
    return this.write(note, { snapshot: true })
  }

  async setGroup(id: string, groupId: string | null): Promise<Note | null> {
    const note = await this.get(id)
    if (!note) return null
    return this.write({ ...note, groupId, updatedAt: new Date().toISOString() }, { snapshot: false })
  }

  async setTags(id: string, tags: string[]): Promise<Note | null> {
    const note = await this.get(id)
    if (!note) return null
    const clean = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))
    return this.write({ ...note, tags: clean, updatedAt: new Date().toISOString() }, { snapshot: false })
  }

  private maybeSnapshot(note: Note): void {
    const latest = this.store.listVersions(note.id)[0]
    const now = note.updatedAt
    if (latest && Date.parse(now) - Date.parse(latest.createdAt) < VERSION_THROTTLE_MS) return
    this.store.addVersion(note.id, this.serialize(note), now)
  }

  async delete(id: string): Promise<void> {
    try {
      await fs.unlink(this.filePath(id))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    this.store.deleteNoteIndex(id)
    this.store.deleteVersionsFor(id)
  }

  list(): NoteSummary[] {
    return this.store.listNoteIndex()
  }

  query(filter: NoteQuery): SearchResult[] {
    return this.store.queryNotes(filter)
  }

  search(query: string): SearchResult[] {
    return this.store.search(query)
  }

  versions(id: string): NoteVersion[] {
    return this.store.listVersions(id)
  }

  async restoreVersion(versionId: string): Promise<Note | null> {
    const version = this.store.getVersion(versionId)
    if (!version) return null
    const restored = this.parse(version.noteId, version.content)
    return this.write({ ...restored, updatedAt: new Date().toISOString() }, { snapshot: true })
  }

  /**
   * Reconcile the SQLite indexes with the working folder (the source of
   * truth): index every `*.md` file (frontmatter group + tags included) and
   * drop rows for files that vanished.
   */
  async reconcile(): Promise<void> {
    let entries: string[] = []
    try {
      entries = (await fs.readdir(this.notesDir)).filter((f) => f.endsWith('.md'))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
      throw err
    }

    const seen = new Set<string>()
    for (const file of entries) {
      const id = path.basename(file, '.md')
      const fp = path.join(this.notesDir, file)
      try {
        const note = this.parse(id, await fs.readFile(fp, 'utf8'))
        this.store.upsertNoteIndex(this.summaryOf(note, fp))
        this.store.setFts(note.id, note.title, note.body)
        this.store.syncNoteTags(this.ownerId, note.id, note.tags)
        seen.add(note.id)
      } catch {
        // Skip unreadable/invalid files rather than failing the whole scan.
      }
    }

    for (const id of this.store.allIndexedIds()) {
      if (!seen.has(id)) this.store.deleteNoteIndex(id)
    }
  }
}
