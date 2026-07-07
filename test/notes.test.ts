import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import matter from 'gray-matter'
import { Store } from '../src/main/db/store'
import { NoteService } from '../src/main/services/notes'

let dir: string
let wf: string
let store: Store
let notes: NoteService

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ng-notes-'))
  wf = path.join(dir, 'workspace')
  store = new Store(path.join(dir, 'test.sqlite'))
  notes = new NoteService(store, 'owner-1', wf)
  await notes.init()
})

afterEach(async () => {
  store.close()
  await fs.rm(dir, { recursive: true, force: true })
})

describe('NoteService', () => {
  it('creates a note as a markdown file with ontology frontmatter', async () => {
    const note = await notes.create()
    const fp = path.join(wf, 'notes', `${note.id}.md`)
    const raw = await fs.readFile(fp, 'utf8')
    const { data } = matter(raw)
    expect(data.ownerId).toBe('owner-1')
    expect(data.ontologyVersion).toBe('0.2.0')
    expect(data.reviewStatus).toBe('accepted')
    expect(data.sensitivity).toBe('business')
    expect(data.id).toBe(note.id)
  })

  it('saves title/body and reads them back (round-trip)', async () => {
    const note = await notes.create()
    await notes.save(note.id, { title: 'My Title', body: 'Hello **world**' })
    const loaded = await notes.get(note.id)
    expect(loaded?.title).toBe('My Title')
    expect(loaded?.body).toContain('Hello **world**')
    // Frontmatter title mirrors the saved title.
    const raw = await fs.readFile(path.join(wf, 'notes', `${note.id}.md`), 'utf8')
    expect(matter(raw).data.title).toBe('My Title')
  })

  it('lists notes and finds them via search', async () => {
    const a = await notes.create()
    await notes.save(a.id, { title: 'Ontology governance', body: 'graph projection notes' })
    const b = await notes.create()
    await notes.save(b.id, { title: 'Groceries', body: 'milk and eggs' })

    expect(notes.list()).toHaveLength(2)
    const hits = notes.search('projection')
    expect(hits.map((h) => h.id)).toContain(a.id)
    expect(hits.map((h) => h.id)).not.toContain(b.id)
  })

  it('deletes a note (file + index + search)', async () => {
    const note = await notes.create()
    await notes.save(note.id, { title: 'Temp', body: 'delete me soon' })
    await notes.delete(note.id)
    expect(await notes.get(note.id)).toBeNull()
    expect(notes.list()).toHaveLength(0)
    expect(notes.search('delete')).toHaveLength(0)
  })

  it('reconciles the index with externally added and removed files', async () => {
    // Externally drop a valid note file into the working folder.
    const id = 'ext-note'
    const body = matter.stringify('external body content', {
      id,
      ownerId: 'owner-1',
      ontologyVersion: '0.2.0',
      title: 'External',
      reviewStatus: 'accepted',
      sensitivity: 'business',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastConfirmedAt: null
    })
    await fs.writeFile(path.join(wf, 'notes', `${id}.md`), body, 'utf8')

    await notes.reconcile()
    expect(notes.list().some((n) => n.id === id)).toBe(true)
    expect(notes.search('external')).toHaveLength(1)

    // Externally remove it, then reconcile again.
    await fs.rm(path.join(wf, 'notes', `${id}.md`))
    await notes.reconcile()
    expect(notes.list().some((n) => n.id === id)).toBe(false)
    expect(notes.search('external')).toHaveLength(0)
  })

  it('keeps and restores version history', async () => {
    const note = await notes.create()
    await notes.save(note.id, { title: 'v1 title', body: 'first content' })
    const versions = notes.versions(note.id)
    expect(versions.length).toBeGreaterThanOrEqual(1)

    // Change the note, then restore the earlier snapshot.
    await notes.save(note.id, { title: 'v2 title', body: 'second content' })
    const restored = await notes.restoreVersion(versions[versions.length - 1].id)
    expect(restored?.body).toContain('first content')
    const loaded = await notes.get(note.id)
    expect(loaded?.body).toContain('first content')
  })
})
