import { BrowserWindow, dialog, ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '@shared/api'
import type { Workspace } from '../services/workspace'
import type { ThemeMode } from '@shared/types'

const saveInputSchema = z.object({ title: z.string(), body: z.string() })
const idSchema = z.string().min(1)
const nullableId = z.string().min(1).nullable()
const themeSchema = z.enum(['light', 'dark', 'system'])
const tagsSchema = z.array(z.string())
const nameSchema = z.string().min(1)
const colorSchema = z.string().nullable()
const querySchema = z.object({
  text: z.string().optional(),
  groupId: z.string().min(1).nullable().optional(),
  tagIds: z.array(z.string()).optional()
})

/**
 * Register all IPC handlers. Every payload from the renderer is validated with
 * zod before it reaches a service (defensive; the renderer is untrusted).
 */
export function registerIpc(workspace: Workspace): void {
  // ---- settings ---------------------------------------------------------
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

  // ---- notes ------------------------------------------------------------
  ipcMain.handle(IPC.notesList, () => workspace.requireNotes().list())
  ipcMain.handle(IPC.notesGet, (_e, id: unknown) => workspace.requireNotes().get(idSchema.parse(id)))
  ipcMain.handle(IPC.notesCreate, (_e, groupId: unknown) =>
    workspace.requireNotes().create(nullableId.optional().parse(groupId) ?? null)
  )
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
  ipcMain.handle(IPC.notesSetGroup, (_e, id: unknown, groupId: unknown) =>
    workspace.requireNotes().setGroup(idSchema.parse(id), nullableId.parse(groupId))
  )
  ipcMain.handle(IPC.notesSetTags, (_e, id: unknown, tags: unknown) =>
    workspace.requireNotes().setTags(idSchema.parse(id), tagsSchema.parse(tags))
  )

  // ---- search -----------------------------------------------------------
  ipcMain.handle(IPC.searchQuery, (_e, q: unknown) =>
    workspace.requireNotes().query(querySchema.parse(q))
  )

  // ---- groups -----------------------------------------------------------
  ipcMain.handle(IPC.groupsList, () => workspace.requireOrg().listGroups())
  ipcMain.handle(IPC.groupsCreate, (_e, name: unknown, parentGroupId: unknown) =>
    workspace.requireOrg().createGroup(nameSchema.parse(name), nullableId.parse(parentGroupId))
  )
  ipcMain.handle(IPC.groupsRename, (_e, id: unknown, name: unknown) =>
    workspace.requireOrg().renameGroup(idSchema.parse(id), nameSchema.parse(name))
  )
  ipcMain.handle(IPC.groupsMove, (_e, id: unknown, parentGroupId: unknown) =>
    workspace.requireOrg().moveGroup(idSchema.parse(id), nullableId.parse(parentGroupId))
  )
  ipcMain.handle(IPC.groupsSetColor, (_e, id: unknown, color: unknown) =>
    workspace.requireOrg().setGroupColor(idSchema.parse(id), colorSchema.parse(color))
  )
  ipcMain.handle(IPC.groupsDelete, (_e, id: unknown) =>
    workspace.requireOrg().deleteGroup(idSchema.parse(id))
  )

  // ---- tags -------------------------------------------------------------
  ipcMain.handle(IPC.tagsList, () => workspace.requireOrg().listTags())
  ipcMain.handle(IPC.tagsCreate, (_e, name: unknown, color: unknown) =>
    workspace.requireOrg().createTag(nameSchema.parse(name), colorSchema.parse(color))
  )
  ipcMain.handle(IPC.tagsRename, (_e, id: unknown, name: unknown) =>
    workspace.requireOrg().renameTag(idSchema.parse(id), nameSchema.parse(name))
  )
  ipcMain.handle(IPC.tagsSetColor, (_e, id: unknown, color: unknown) =>
    workspace.requireOrg().setTagColor(idSchema.parse(id), colorSchema.parse(color))
  )
  ipcMain.handle(IPC.tagsDelete, (_e, id: unknown) =>
    workspace.requireOrg().deleteTag(idSchema.parse(id))
  )
}
