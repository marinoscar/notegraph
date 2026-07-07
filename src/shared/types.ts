import type { ReviewStatus, Sensitivity } from './ontology'

/** Ontology metadata carried in every note's YAML frontmatter (VISION.md §4.1). */
export interface NoteFrontmatter {
  id: string
  ownerId: string
  ontologyVersion: string
  title: string
  reviewStatus: ReviewStatus
  sensitivity: Sensitivity
  /** Group assignment (Phase 2). Null = ungrouped. Travels with the file. */
  groupId: string | null
  /** Applied tag names (Phase 2). Travels with the file. */
  tags: string[]
  createdAt: string
  updatedAt: string
  lastConfirmedAt: string | null
}

/** A note as surfaced to the renderer: frontmatter + markdown body. */
export interface Note extends NoteFrontmatter {
  body: string
}

/** Lightweight note descriptor used for list views (no body). */
export type NoteSummary = Omit<Note, 'body'>

/** A saved snapshot in a note's version history. */
export interface NoteVersion {
  id: string
  noteId: string
  content: string
  createdAt: string
}

/** A notes-query hit: title, an HTML-free snippet (empty when no text term), and recency. */
export interface SearchResult {
  id: string
  title: string
  snippet: string
  updatedAt: string
}

/** A hierarchical group (Phase 2). Definition lives in SQLite. */
export interface Group {
  id: string
  ownerId: string
  parentGroupId: string | null
  name: string
  color: string | null
  createdAt: string
}

/** A polymorphic tag (Phase 2). Definition lives in SQLite. */
export interface Tag {
  id: string
  ownerId: string
  name: string
  color: string | null
}

/** Combined filter for the notes list (Phase 2). */
export interface NoteQuery {
  text?: string
  /** Restrict to this group and its descendants. */
  groupId?: string | null
  /** Restrict to notes carrying ALL of these tag ids. */
  tagIds?: string[]
}

export type ThemeMode = 'light' | 'dark' | 'system'

/** App settings surfaced to the renderer. */
export interface AppSettings {
  ownerId: string
  workingFolderPath: string | null
  theme: ThemeMode
}

/** Payload accepted by notes.save (autosave). */
export interface NoteSaveInput {
  title: string
  body: string
}
