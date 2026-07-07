import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Store, toFtsQuery } from '../src/main/db/store'

let dir: string
let store: Store

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ng-store-'))
  store = new Store(path.join(dir, 'test.sqlite'))
})

afterEach(async () => {
  store.close()
  await fs.rm(dir, { recursive: true, force: true })
})

describe('Store settings', () => {
  it('reads and writes settings', () => {
    expect(store.getSetting('missing')).toBeNull()
    store.setSetting('theme', 'dark')
    expect(store.getSetting('theme')).toBe('dark')
    store.setSetting('theme', 'light')
    expect(store.getSetting('theme')).toBe('light')
  })
})

describe('Store notes index + FTS', () => {
  const summary = {
    id: 'n1',
    ownerId: 'owner',
    path: '/tmp/n1.md',
    title: 'Alpha note',
    sensitivity: 'business' as const,
    reviewStatus: 'accepted' as const,
    ontologyVersion: '0.2.0',
    groupId: null,
    tags: [] as string[],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    lastConfirmedAt: null
  }

  it('upserts and lists notes', () => {
    store.upsertNoteIndex(summary)
    const list = store.listNoteIndex()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('Alpha note')
    expect(list[0].ownerId).toBe('owner')
  })

  it('finds notes via full-text search with a snippet', () => {
    store.upsertNoteIndex(summary)
    store.setFts('n1', 'Alpha note', 'The quick brown fox jumps')
    const hits = store.search('brown')
    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe('n1')
    expect(hits[0].snippet.toLowerCase()).toContain('brown')
  })

  it('supports prefix matching and ignores punctuation', () => {
    store.upsertNoteIndex(summary)
    store.setFts('n1', 'Alpha note', 'ontology governance matters')
    expect(store.search('gov')).toHaveLength(1)
    expect(store.search('!!!')).toHaveLength(0)
  })

  it('deletes notes from index and FTS', () => {
    store.upsertNoteIndex(summary)
    store.setFts('n1', 'Alpha note', 'body text here')
    store.deleteNoteIndex('n1')
    expect(store.listNoteIndex()).toHaveLength(0)
    expect(store.search('body')).toHaveLength(0)
  })
})

describe('Store version history', () => {
  it('adds, lists, and retrieves versions newest-first', () => {
    store.addVersion('n1', 'v1', '2026-01-01T00:00:00.000Z')
    store.addVersion('n1', 'v2', '2026-01-02T00:00:00.000Z')
    const versions = store.listVersions('n1')
    expect(versions).toHaveLength(2)
    expect(versions[0].content).toBe('v2')
    const got = store.getVersion(versions[0].id)
    expect(got?.content).toBe('v2')
  })
})

describe('toFtsQuery', () => {
  it('builds prefix AND queries and rejects empty input', () => {
    expect(toFtsQuery('  ')).toBeNull()
    expect(toFtsQuery('Hello World')).toBe('hello* world*')
    expect(toFtsQuery('a-b, c!')).toBe('ab* c*')
  })
})
