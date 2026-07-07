import { BrowserWindow, dialog, ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '@shared/api'
import type { Workspace } from '../services/workspace'
import type { ThemeMode } from '@shared/types'

const saveInputSchema = z.object({ title: z.string(), body: z.string() })
const idSchema = z.string().min(1)
const themeSchema = z.enum(['light', 'dark', 'system'])

/**
 * Register all IPC handlers. Every payload from the renderer is validated with
 * zod before it reaches a service (defensive; the renderer is untrusted).
 */
export function registerIpc(workspace: Workspace): void {
  ipcMain.handle(IPC.settingsGet, () => workspace.getSettings())

  ipcMain.handle(IPC.settingsPickFolder, async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose your notegraph working folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.settingsSetFolder, async (_e, folderPath: unknown) => {
    await workspace.setWorkingFolder(idSchema.parse(folderPath))
    return workspace.getSettings()
  })

  ipcMain.handle(IPC.settingsSetTheme, (_e, theme: unknown) => {
    workspace.setTheme(themeSchema.parse(theme) as ThemeMode)
  })

  ipcMain.handle(IPC.notesList, () => workspace.requireNotes().list())

  ipcMain.handle(IPC.notesGet, (_e, id: unknown) => workspace.requireNotes().get(idSchema.parse(id)))

  ipcMain.handle(IPC.notesCreate, () => workspace.requireNotes().create())

  ipcMain.handle(IPC.notesSave, (_e, id: unknown, input: unknown) =>
    workspace.requireNotes().save(idSchema.parse(id), saveInputSchema.parse(input))
  )

  ipcMain.handle(IPC.notesDelete, (_e, id: unknown) =>
    workspace.requireNotes().delete(idSchema.parse(id))
  )

  ipcMain.handle(IPC.notesVersions, (_e, id: unknown) =>
    workspace.requireNotes().versions(idSchema.parse(id))
  )

  ipcMain.handle(IPC.notesRestore, (_e, versionId: unknown) =>
    workspace.requireNotes().restoreVersion(idSchema.parse(versionId))
  )

  ipcMain.handle(IPC.searchQuery, (_e, text: unknown) =>
    workspace.requireNotes().search(z.string().parse(text))
  )
}
