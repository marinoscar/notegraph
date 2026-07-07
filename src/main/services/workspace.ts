import { Store } from '../db/store'
import { NoteService } from './notes'
import type { AppSettings, ThemeMode } from '@shared/types'

const KEY_WORKING_FOLDER = 'workingFolderPath'
const KEY_OWNER_ID = 'ownerId'
const KEY_THEME = 'theme'

/**
 * Central main-process coordinator: owns the SQLite Store, the stable local
 * ownerId, and (once a working folder is chosen) the NoteService. IPC handlers
 * call through here.
 */
export class Workspace {
  readonly store: Store
  readonly ownerId: string
  private notes: NoteService | null = null

  constructor(dbPath: string) {
    this.store = new Store(dbPath)
    this.ownerId = this.ensureOwnerId()
  }

  private ensureOwnerId(): string {
    let id = this.store.getSetting(KEY_OWNER_ID)
    if (!id) {
      id = crypto.randomUUID()
      this.store.setSetting(KEY_OWNER_ID, id)
    }
    return id
  }

  getSettings(): AppSettings {
    return {
      ownerId: this.ownerId,
      workingFolderPath: this.store.getSetting(KEY_WORKING_FOLDER),
      theme: (this.store.getSetting(KEY_THEME) as ThemeMode) ?? 'system'
    }
  }

  setTheme(theme: ThemeMode): void {
    this.store.setSetting(KEY_THEME, theme)
  }

  /** Build the NoteService for a working folder and index its contents. */
  async setWorkingFolder(folderPath: string): Promise<void> {
    this.store.setSetting(KEY_WORKING_FOLDER, folderPath)
    this.notes = new NoteService(this.store, this.ownerId, folderPath)
    await this.notes.init()
  }

  /** On boot, re-attach to a previously chosen working folder if present. */
  async restore(): Promise<void> {
    const folderPath = this.store.getSetting(KEY_WORKING_FOLDER)
    if (folderPath) {
      this.notes = new NoteService(this.store, this.ownerId, folderPath)
      await this.notes.init()
    }
  }

  hasWorkingFolder(): boolean {
    return this.notes !== null
  }

  /** Access the NoteService, or throw a clear error if no folder is set. */
  requireNotes(): NoteService {
    if (!this.notes) {
      throw new Error('No working folder selected. Choose one in Settings first.')
    }
    return this.notes
  }

  close(): void {
    this.store.close()
  }
}
