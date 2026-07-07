import type {
  AppSettings,
  Note,
  NoteSaveInput,
  NoteSummary,
  NoteVersion,
  SearchResult,
  ThemeMode
} from './types'

/** IPC channel names — single source of truth for main + preload. */
export const IPC = {
  settingsGet: 'settings:get',
  settingsPickFolder: 'settings:pickWorkingFolder',
  settingsSetFolder: 'settings:setWorkingFolder',
  settingsSetTheme: 'settings:setTheme',
  notesList: 'notes:list',
  notesGet: 'notes:get',
  notesCreate: 'notes:create',
  notesSave: 'notes:save',
  notesDelete: 'notes:delete',
  notesVersions: 'notes:versions',
  notesRestore: 'notes:restoreVersion',
  searchQuery: 'search:query'
} as const

/** The typed surface exposed to the renderer as `window.notegraph`. */
export interface NotegraphApi {
  settings: {
    get(): Promise<AppSettings>
    pickWorkingFolder(): Promise<string | null>
    setWorkingFolder(path: string): Promise<AppSettings>
    setTheme(theme: ThemeMode): Promise<void>
  }
  notes: {
    list(): Promise<NoteSummary[]>
    get(id: string): Promise<Note | null>
    create(): Promise<Note>
    save(id: string, input: NoteSaveInput): Promise<Note>
    delete(id: string): Promise<void>
    versions(id: string): Promise<NoteVersion[]>
    restoreVersion(versionId: string): Promise<Note | null>
  }
  search: {
    query(text: string): Promise<SearchResult[]>
  }
}
