import type { ReviewStatus, Sensitivity } from './ontology'

/** Ontology metadata carried in every note's YAML frontmatter (VISION.md §4.1). */
export interface NoteFrontmatter {
  id: string
  ownerId: string
  ontologyVersion: string
  title: string
  reviewStatus: ReviewStatus
  sensitivity: Sensitivity
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

/** A full-text search hit with an HTML-free text snippet. */
export interface SearchResult {
  id: string
  title: string
  snippet: string
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
