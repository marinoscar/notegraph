import type { Store } from '../db/store'
import type { NoteService } from './notes'
import type { Group, Tag } from '@shared/types'

/**
 * Coordinates group/tag *definitions* (SQLite) with note *assignments*
 * (markdown frontmatter). Definition changes that affect notes — deleting a
 * group, renaming/deleting a tag — propagate into the affected notes'
 * frontmatter so the working folder stays the source of truth (VISION.md §5.1a).
 */
export class OrganizationService {
  constructor(
    private readonly store: Store,
    private readonly notes: NoteService,
    private readonly ownerId: string
  ) {}

  // ---- groups -------------------------------------------------------------

  listGroups(): Group[] {
    return this.store.listGroups(this.ownerId)
  }

  createGroup(name: string, parentGroupId: string | null): Group {
    const clean = name.trim() || 'New group'
    return this.store.createGroup(this.ownerId, clean, parentGroupId, new Date().toISOString())
  }

  renameGroup(id: string, name: string): void {
    const clean = name.trim()
    if (clean) this.store.renameGroup(id, clean)
  }

  moveGroup(id: string, parentGroupId: string | null): void {
    if (parentGroupId === id) throw new Error('A group cannot be its own parent.')
    if (parentGroupId && this.store.isDescendantOf(id, parentGroupId)) {
      throw new Error('Cannot move a group into one of its own descendants.')
    }
    this.store.setGroupParent(id, parentGroupId)
  }

  setGroupColor(id: string, color: string | null): void {
    this.store.setGroupColor(id, color)
  }

  /** Delete a group: clear direct members' frontmatter, promote children. */
  async deleteGroup(id: string): Promise<void> {
    for (const noteId of this.store.noteIdsInGroup(id)) {
      await this.notes.setGroup(noteId, null)
    }
    this.store.deleteGroup(id)
  }

  // ---- tags ---------------------------------------------------------------

  listTags(): Tag[] {
    return this.store.listTags(this.ownerId)
  }

  createTag(name: string, color: string | null): Tag {
    const clean = name.trim()
    if (!clean) throw new Error('Tag name cannot be empty.')
    const tag = this.store.getOrCreateTag(this.ownerId, clean)
    if (color !== null) this.store.setTagColor(tag.id, color)
    return { ...tag, color: color ?? tag.color }
  }

  async renameTag(id: string, name: string): Promise<void> {
    const clean = name.trim()
    const tag = this.store.getTag(id)
    if (!tag || !clean || clean === tag.name) return
    const conflict = this.store.getTagByName(this.ownerId, clean)
    if (conflict && conflict.id !== id) {
      throw new Error(`A tag named "${clean}" already exists.`)
    }
    this.store.renameTag(id, clean)
    // Propagate the new name into every note that carries the old one.
    for (const noteId of this.store.noteIdsWithTag(id)) {
      const note = await this.notes.get(noteId)
      if (!note) continue
      const next = note.tags.map((t) => (t === tag.name ? clean : t))
      await this.notes.setTags(noteId, next)
    }
  }

  setTagColor(id: string, color: string | null): void {
    this.store.setTagColor(id, color)
  }

  async deleteTag(id: string): Promise<void> {
    const tag = this.store.getTag(id)
    if (!tag) return
    for (const noteId of this.store.noteIdsWithTag(id)) {
      const note = await this.notes.get(noteId)
      if (!note) continue
      await this.notes.setTags(
        noteId,
        note.tags.filter((t) => t !== tag.name)
      )
    }
    this.store.deleteTag(id)
  }
}
