import type {
  AppSettings,
  Group,
  Note,
  NoteQuery,
  NoteSaveInput,
  NoteSummary,
  NoteVersion,
  SearchResult,
  Tag,
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
  notesSetGroup: 'notes:setGroup',
  notesSetTags: 'notes:setTags',
  searchQuery: 'search:query',
  groupsList: 'groups:list',
  groupsCreate: 'groups:create',
  groupsRename: 'groups:rename',
  groupsMove: 'groups:move',
  groupsSetColor: 'groups:setColor',
  groupsDelete: 'groups:delete',
  tagsList: 'tags:list',
  tagsCreate: 'tags:create',
  tagsRename: 'tags:rename',
  tagsSetColor: 'tags:setColor',
  tagsDelete: 'tags:delete'
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
    create(groupId?: string | null): Promise<Note>
    save(id: string, input: NoteSaveInput): Promise<Note>
    delete(id: string): Promise<void>
    versions(id: string): Promise<NoteVersion[]>
    restoreVersion(versionId: string): Promise<Note | null>
    setGroup(id: string, groupId: string | null): Promise<Note>
    setTags(id: string, tags: string[]): Promise<Note>
  }
  search: {
    query(q: NoteQuery): Promise<SearchResult[]>
  }
  groups: {
    list(): Promise<Group[]>
    create(name: string, parentGroupId: string | null): Promise<Group>
    rename(id: string, name: string): Promise<void>
    move(id: string, parentGroupId: string | null): Promise<void>
    setColor(id: string, color: string | null): Promise<void>
    delete(id: string): Promise<void>
  }
  tags: {
    list(): Promise<Tag[]>
    create(name: string, color: string | null): Promise<Tag>
    rename(id: string, name: string): Promise<void>
    setColor(id: string, color: string | null): Promise<void>
    delete(id: string): Promise<void>
  }
}
