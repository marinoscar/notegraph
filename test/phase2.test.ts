import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import matter from 'gray-matter'
import { Store } from '../src/main/db/store'
import { NoteService } from '../src/main/services/notes'
import { OrganizationService } from '../src/main/services/organization'

const OWNER = 'owner-1'
let dir: string
let wf: string
let store: Store
let notes: NoteService
let org: OrganizationService

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ng-p2-'))
  wf = path.join(dir, 'workspace')
  store = new Store(path.join(dir, 'test.sqlite'))
  notes = new NoteService(store, OWNER, wf)
  await notes.init()
  org = new OrganizationService(store, notes, OWNER)
})

afterEach(async () => {
  store.close()
  await fs.rm(dir, { recursive: true, force: true })
})

async function frontmatterOf(id: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(path.join(wf, 'notes', `${id}.md`), 'utf8')
  return matter(raw).data
}

describe('Groups', () => {
  it('creates nested groups and prevents cycles on move', () => {
    const a = org.createGroup('Client A', null)
    const b = org.createGroup('Project B', a.id)
    expect(org.listGroups().map((g) => g.name).sort()).toEqual(['Client A', 'Project B'])
    expect(store.isDescendantOf(a.id, b.id)).toBe(true)
    expect(() => org.moveGroup(a.id, b.id)).toThrow(/descendant/i)
    expect(() => org.moveGroup(a.id, a.id)).toThrow(/own parent/i)
  })

  it('deleting a group promotes children and ungroups its notes', async () => {
    const a = org.createGroup('A', null)
    const b = org.createGroup('B', a.id)
    const note = await notes.create(a.id)
    expect((await frontmatterOf(note.id)).groupId).toBe(a.id)

    await org.deleteGroup(a.id)

    // Child B promoted to root.
    const bAfter = store.getGroup(b.id)
    expect(bAfter?.parentGroupId).toBeNull()
    // Note's frontmatter cleared to ungrouped.
    expect((await frontmatterOf(note.id)).groupId).toBeNull()
  })
})

describe('Tags', () => {
  it('get-or-create is unique per owner+name', () => {
    const t1 = store.getOrCreateTag(OWNER, 'graphs')
    const t2 = store.getOrCreateTag(OWNER, 'graphs')
    expect(t1.id).toBe(t2.id)
    expect(store.listTags(OWNER)).toHaveLength(1)
  })

  it('renaming a tag propagates to note frontmatter and rejects conflicts', async () => {
    const note = await notes.create()
    await notes.setTags(note.id, ['draft', 'idea'])
    const draft = store.getTagByName(OWNER, 'draft')!

    await org.renameTag(draft.id, 'wip')
    expect(((await frontmatterOf(note.id)).tags as string[]).sort()).toEqual(['idea', 'wip'])

    // Renaming onto an existing tag name is rejected.
    const idea = store.getTagByName(OWNER, 'idea')!
    await expect(org.renameTag(idea.id, 'wip')).rejects.toThrow(/already exists/i)
  })

  it('deleting a tag removes it from notes and the index', async () => {
    const note = await notes.create()
    await notes.setTags(note.id, ['keep', 'remove'])
    const remove = store.getTagByName(OWNER, 'remove')!

    await org.deleteTag(remove.id)
    expect((await frontmatterOf(note.id)).tags).toEqual(['keep'])
    expect(store.getTagByName(OWNER, 'remove')).toBeNull()
  })
})

describe('Note assignment + reconcile', () => {
  it('setGroup and setTags persist to frontmatter and the index', async () => {
    const g = org.createGroup('Work', null)
    const note = await notes.create()
    await notes.setGroup(note.id, g.id)
    await notes.setTags(note.id, ['alpha'])

    const fm = await frontmatterOf(note.id)
    expect(fm.groupId).toBe(g.id)
    expect(fm.tags).toEqual(['alpha'])

    const summary = notes.list().find((n) => n.id === note.id)!
    expect(summary.groupId).toBe(g.id)
    expect(summary.tags).toEqual(['alpha'])
  })

  it('reconcile rebuilds group/tag assignment from frontmatter', async () => {
    const g = org.createGroup('Ext', null)
    const id = 'ext1'
    const content = matter.stringify('external body', {
      id,
      ownerId: OWNER,
      ontologyVersion: '0.2.0',
      title: 'External',
      reviewStatus: 'accepted',
      sensitivity: 'business',
      groupId: g.id,
      tags: ['imported', 'graph'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastConfirmedAt: null
    })
    await fs.writeFile(path.join(wf, 'notes', `${id}.md`), content, 'utf8')

    await notes.reconcile()

    const summary = notes.list().find((n) => n.id === id)!
    expect(summary.groupId).toBe(g.id)
    expect(summary.tags.sort()).toEqual(['graph', 'imported'])
    // Tags were auto-created by name.
    expect(store.getTagByName(OWNER, 'imported')).not.toBeNull()
  })
})

describe('Filtered query', () => {
  it('filters by group including descendants', async () => {
    const a = org.createGroup('A', null)
    const b = org.createGroup('B', a.id)
    const inB = await notes.create(b.id)
    const ungrouped = await notes.create(null)

    const hitsA = notes.query({ groupId: a.id }).map((r) => r.id)
    expect(hitsA).toContain(inB.id) // descendant included
    expect(hitsA).not.toContain(ungrouped.id)
  })

  it('filters by tags with AND semantics, and combines with text', async () => {
    const n1 = await notes.create()
    await notes.save(n1.id, { title: 'One', body: 'graph projection content' })
    await notes.setTags(n1.id, ['x', 'y'])
    const n2 = await notes.create()
    await notes.save(n2.id, { title: 'Two', body: 'graph other content' })
    await notes.setTags(n2.id, ['x'])

    const x = store.getTagByName(OWNER, 'x')!
    const y = store.getTagByName(OWNER, 'y')!

    // AND: only the note with both x and y.
    const both = notes.query({ tagIds: [x.id, y.id] }).map((r) => r.id)
    expect(both).toEqual([n1.id])

    // Text + tag filter combined.
    const combined = notes.query({ text: 'projection', tagIds: [x.id] }).map((r) => r.id)
    expect(combined).toEqual([n1.id])
  })
})
