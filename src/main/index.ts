import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import { join } from 'path'
import {
  createDatabase,
  openDatabase,
  closeDatabase,
  getProjectMeta,
  updateProjectMeta,
  getAllNodes,
  getNode,
  createNode,
  updateNode,
  deleteNode,
  reorderNodes,
  getEntityNodes,
  getProjectPath,
  isOpen,
  touchProject
} from './database'
import {
  showOpenProjectDialog,
  showSaveProjectDialog,
  showSelectImageDialog
} from './fileSystem'
import { createBackup, listBackups } from './backup'
import type { ExportOptions, NodeType, SaveResult } from '@shared/types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:newProject')
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:openProject')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function registerIpcHandlers(): void {
  ipcMain.handle('project:create', async (_, { path, title, author }) => {
    const meta = createDatabase(path, title, author)
    const backup = createBackup(path)
    return { path, meta, backupPath: backup?.path }
  })

  ipcMain.handle('project:open', async (_, { path }) => {
    openDatabase(path)
    const meta = getProjectMeta()
    return { path, meta }
  })

  ipcMain.handle('project:close', async () => {
    closeDatabase()
    return { success: true }
  })

  ipcMain.handle('project:getInfo', async () => {
    if (!isOpen()) return null
    return {
      path: getProjectPath(),
      meta: getProjectMeta()
    }
  })

  ipcMain.handle('project:save', async (): Promise<SaveResult> => {
    const path = getProjectPath()
    if (!path) return { success: false, lastSaved: '' }

    const lastSaved = touchProject()
    const backup = createBackup(path)
    return {
      success: true,
      lastSaved,
      backupPath: backup?.path
    }
  })

  ipcMain.handle('project:updateMeta', async (_, updates) => {
    return updateProjectMeta(updates)
  })

  ipcMain.handle('dialog:openProject', async () => {
    if (!mainWindow) return null
    return showOpenProjectDialog(mainWindow)
  })

  ipcMain.handle('dialog:saveProjectAs', async (_, defaultName?: string) => {
    if (!mainWindow) return null
    return showSaveProjectDialog(mainWindow, defaultName)
  })

  ipcMain.handle('dialog:selectImage', async () => {
    if (!mainWindow) return null
    return showSelectImageDialog(mainWindow)
  })

  ipcMain.handle('tree:getAll', async () => {
    return getAllNodes()
  })

  ipcMain.handle('tree:create', async (_, { parentId, type, title }) => {
    return createNode(parentId, type as NodeType, title)
  })

  ipcMain.handle('tree:update', async (_, { id, ...updates }) => {
    return updateNode(id, updates)
  })

  ipcMain.handle('tree:delete', async (_, { id }) => {
    deleteNode(id)
    return { success: true }
  })

  ipcMain.handle('tree:reorder', async (_, { items }) => {
    return reorderNodes(items)
  })

  ipcMain.handle('entity:getAll', async () => {
    return getEntityNodes()
  })

  ipcMain.handle('entity:getById', async (_, { id }) => {
    return getNode(id)
  })

  ipcMain.handle('backup:list', async () => {
    const path = getProjectPath()
    if (!path) return []
    return listBackups(path)
  })

  ipcMain.handle('export:document', async (_, options: ExportOptions) => {
    // Export implementation placeholder — will be expanded
    return { success: false, message: 'Export not yet implemented' }
  })
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.texteditor.app')
  }

  registerIpcHandlers()
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})
