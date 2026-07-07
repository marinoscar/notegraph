import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type NotegraphApi } from '@shared/api'

/** The single, minimal, typed surface exposed to the renderer. */
const api: NotegraphApi = {
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    pickWorkingFolder: () => ipcRenderer.invoke(IPC.settingsPickFolder),
    setWorkingFolder: (folderPath) => ipcRenderer.invoke(IPC.settingsSetFolder, folderPath),
    setTheme: (theme) => ipcRenderer.invoke(IPC.settingsSetTheme, theme)
  },
  notes: {
    list: () => ipcRenderer.invoke(IPC.notesList),
    get: (id) => ipcRenderer.invoke(IPC.notesGet, id),
    create: (groupId = null) => ipcRenderer.invoke(IPC.notesCreate, groupId),
    save: (id, input) => ipcRenderer.invoke(IPC.notesSave, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.notesDelete, id),
    versions: (id) => ipcRenderer.invoke(IPC.notesVersions, id),
    restoreVersion: (versionId) => ipcRenderer.invoke(IPC.notesRestore, versionId),
    setGroup: (id, groupId) => ipcRenderer.invoke(IPC.notesSetGroup, id, groupId),
    setTags: (id, tags) => ipcRenderer.invoke(IPC.notesSetTags, id, tags)
  },
  search: {
    query: (q) => ipcRenderer.invoke(IPC.searchQuery, q)
  },
  groups: {
    list: () => ipcRenderer.invoke(IPC.groupsList),
    create: (name, parentGroupId) => ipcRenderer.invoke(IPC.groupsCreate, name, parentGroupId),
    rename: (id, name) => ipcRenderer.invoke(IPC.groupsRename, id, name),
    move: (id, parentGroupId) => ipcRenderer.invoke(IPC.groupsMove, id, parentGroupId),
    setColor: (id, color) => ipcRenderer.invoke(IPC.groupsSetColor, id, color),
    delete: (id) => ipcRenderer.invoke(IPC.groupsDelete, id)
  },
  tags: {
    list: () => ipcRenderer.invoke(IPC.tagsList),
    create: (name, color) => ipcRenderer.invoke(IPC.tagsCreate, name, color),
    rename: (id, name) => ipcRenderer.invoke(IPC.tagsRename, id, name),
    setColor: (id, color) => ipcRenderer.invoke(IPC.tagsSetColor, id, color),
    delete: (id) => ipcRenderer.invoke(IPC.tagsDelete, id)
  }
}

contextBridge.exposeInMainWorld('notegraph', api)
