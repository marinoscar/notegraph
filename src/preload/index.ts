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
    create: () => ipcRenderer.invoke(IPC.notesCreate),
    save: (id, input) => ipcRenderer.invoke(IPC.notesSave, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.notesDelete, id),
    versions: (id) => ipcRenderer.invoke(IPC.notesVersions, id),
    restoreVersion: (versionId) => ipcRenderer.invoke(IPC.notesRestore, versionId)
  },
  search: {
    query: (text) => ipcRenderer.invoke(IPC.searchQuery, text)
  }
}

contextBridge.exposeInMainWorld('notegraph', api)
