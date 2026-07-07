import { app, shell, BrowserWindow } from 'electron'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import { Workspace } from './services/workspace'
import { LadybugService } from './services/ladybug'
import { registerIpc } from './ipc'

let workspace: Workspace | null = null
const ladybug = new LadybugService()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'notegraph',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

async function boot(): Promise<void> {
  const userData = app.getPath('userData')

  // SQLite app database — essential (settings, notes index, search, versions).
  workspace = new Workspace(path.join(userData, 'notegraph.sqlite'))
  console.info(`[sqlite] ok — schema v${workspace.store.schemaVersion}`)
  await workspace.restore()

  // LadybugDB — Phase 1 health check only; non-fatal (see LadybugService).
  await ladybug.init(path.join(userData, 'notegraph.ladybug'))

  registerIpc(workspace)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Headless boot smoke test: verify both native modules loaded, then quit.
  if (process.env['NG_SMOKE'] === '1') {
    console.info(`[smoke] boot complete — ladybug.available=${ladybug.available}`)
    setTimeout(() => app.quit(), 400)
  }
}

app.whenReady().then(boot)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', async () => {
  await ladybug.close()
  workspace?.close()
})
