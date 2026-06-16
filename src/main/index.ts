import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron'
import { join } from 'path'
import {
  createProject,
  openProject,
  closeProject,
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
  getProjectRootPath,
  isOpen,
  saveProject,
  getRecentProjectsWithStatus,
  getUiState,
  updateUiState,
  createChapter,
  getSyncState,
  importCharacterImage,
  importEntityImage
} from './tomes/projectStore'
import { validateTomesFile } from './tomes/validate'
import {
  showOpenTomesDialog,
  showChooseFolderDialog,
  showSelectImageDialog
} from './fileSystem'
import { checkBackupLocations, listLocalBackups } from './tomes/backup'
import {
  getConfig,
  removeFromRecent,
  setBackupLocations,
  updatePreferences,
  updateRecentPrimaryPath,
  updateWindowLayout,
  getWindowLayout
} from './config'
import {
  setMainWindow,
  detachPanel,
  reattachPanel,
  openDocumentWindow,
  openImageViewerWindow,
  broadcast,
  saveSecondaryWindowState,
  getMainWindow,
  getPanelOwnerWindowId
} from './windowManager'
import { registerAssetScheme, registerAssetProtocol } from './assetProtocol'
import type { CreateProjectInput, ExportOptions, NodeType } from '@shared/types'

let mainWindow: BrowserWindow | null = null
let pendingOpenPath: string | null = null
let isQuitting = false

const gotLock = app.requestSingleInstanceLock()

registerAssetScheme()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const tomesPath = findTomesPathInArgv(argv)
    if (tomesPath && mainWindow) {
      void openProjectFromPath(tomesPath)
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function findTomesPathInArgv(argv: string[]): string | null {
  for (const arg of argv) {
    if (arg.endsWith('.tomes') && !arg.startsWith('-')) {
      return arg
    }
  }
  return null
}

function broadcastSync(): void {
  broadcast('sync:state', getSyncState())
}

async function openProjectFromPath(tomesPath: string): Promise<void> {
  const validation = await validateTomesFile(tomesPath)
  if (!validation.valid) {
    dialog.showErrorBox('Invalid Project', validation.error ?? 'Could not open project file')
    return
  }

  try {
    const result = await openProject(tomesPath)
    mainWindow?.webContents.send('tomes:projectOpened', result)
  } catch (err) {
    dialog.showErrorBox(
      'Open Failed',
      err instanceof Error ? err.message : 'Could not open project'
    )
  }
}

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
    if (pendingOpenPath) {
      const path = pendingOpenPath
      pendingOpenPath = null
      void openProjectFromPath(path)
    }
  })

  if (mainWindow) setMainWindow(mainWindow)

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
  ipcMain.handle('tomes:createProject', async (_, input: CreateProjectInput) => {
    return createProject(input)
  })

  ipcMain.handle('tomes:openProject', async (_, { path }) => {
    return openProject(path)
  })

  ipcMain.handle('tomes:saveProject', async () => {
    return saveProject()
  })

  ipcMain.handle('tomes:getRecentProjects', async () => {
    return getRecentProjectsWithStatus()
  })

  ipcMain.handle('tomes:removeFromRecent', async (_, { id }) => {
    await removeFromRecent(id)
    return { success: true }
  })

  ipcMain.handle('tomes:updateBackupLocations', async (_, { projectId, paths }) => {
    await setBackupLocations(projectId, paths)
    return { success: true }
  })

  ipcMain.handle('tomes:checkBackupLocations', async (_, { paths }) => {
    return checkBackupLocations(paths)
  })

  ipcMain.handle('tomes:getConfig', async () => {
    return getConfig()
  })

  ipcMain.handle('tomes:updatePreferences', async (_, updates) => {
    const prefs = await updatePreferences(updates)
    if (updates.theme) {
      broadcast('theme:changed', { theme: prefs.theme })
    }
    return prefs
  })

  ipcMain.handle('tomes:updateRecentPath', async (_, { projectId, primaryPath }) => {
    await updateRecentPrimaryPath(projectId, primaryPath)
    return { success: true }
  })

  ipcMain.handle('tomes:showInFolder', async (_, { path }) => {
    shell.showItemInFolder(path)
    return { success: true }
  })

  ipcMain.handle('tomes:closeProject', async () => {
    closeProject()
    return { success: true }
  })

  ipcMain.handle('tomes:createChapter', async (_, { structure }) => {
    const node = await createChapter(structure)
    broadcastSync()
    return node
  })

  ipcMain.handle('tomes:updateUiState', async (_, uiState) => {
    const result = await updateUiState(uiState)
    broadcastSync()
    return result
  })

  ipcMain.handle('tomes:getSyncState', async () => {
    return getSyncState()
  })

  ipcMain.handle('windows:detach', async (event, { panel }) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    if (!ownerWindow) return { success: false }

    const config = await getConfig()
    detachPanel(panel, ownerWindow, config.preferences.theme)

    const mainWin = getMainWindow()
    if (ownerWindow.id === mainWin?.id) {
      const layout = await getWindowLayout()
      await updateWindowLayout({
        sidebarDetached: panel === 'sidebar' ? true : layout.sidebarDetached,
        entityDetached: panel === 'entity' ? true : layout.entityDetached
      })
    }
    return { success: true }
  })

  ipcMain.handle('windows:reattach', async (event, { panel }) => {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender)
    if (!sourceWindow) return { success: false }

    const ownerWindowId = getPanelOwnerWindowId(sourceWindow, panel)
    reattachPanel(panel, sourceWindow)

    const mainWin = getMainWindow()
    if (ownerWindowId !== undefined && ownerWindowId === mainWin?.id) {
      const layout = await getWindowLayout()
      await updateWindowLayout({
        sidebarDetached: panel === 'sidebar' ? false : layout.sidebarDetached,
        entityDetached: panel === 'entity' ? false : layout.entityDetached
      })
    }
    return { success: true }
  })

  ipcMain.handle('windows:openDocument', async (_, { nodeId, title }) => {
    const config = await getConfig()
    openDocumentWindow(nodeId, title, config.preferences.theme)
    await updateWindowLayout({ secondaryWindows: saveSecondaryWindowState() })
    return { success: true }
  })

  ipcMain.handle('windows:openImageViewer', async (_, { imagePath, title }) => {
    const config = await getConfig()
    openImageViewerWindow(imagePath, title, config.preferences.theme)
    return { success: true }
  })

  ipcMain.handle('windows:getLayout', async () => {
    return getWindowLayout()
  })

  ipcMain.handle('windows:updateLayout', async (_, updates) => {
    return updateWindowLayout(updates)
  })

  ipcMain.handle('tomes:getProjectInfo', async () => {
    if (!isOpen()) return null
    return { path: getProjectPath(), meta: getProjectMeta() }
  })

  ipcMain.handle('dialog:openTomes', async () => {
    if (!mainWindow) return null
    return showOpenTomesDialog(mainWindow)
  })

  ipcMain.handle('dialog:chooseFolder', async (_, title?: string) => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow
    if (!win) return null
    return showChooseFolderDialog(win, title)
  })

  ipcMain.handle('dialog:selectImage', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow
    if (!win) return null
    return showSelectImageDialog(win)
  })

  ipcMain.handle('tree:getAll', async () => {
    return getAllNodes()
  })

  ipcMain.handle('tree:create', async (_, { parentId, type, title }) => {
    return createNode(parentId, type as NodeType, title)
  })

  ipcMain.handle('tree:update', async (_, { id, ...updates }) => {
    const node = await updateNode(id, updates)
    broadcastSync()
    return node
  })

  ipcMain.handle('tree:delete', async (_, { id }) => {
    await deleteNode(id)
    broadcastSync()
    return { success: true }
  })

  ipcMain.handle('tree:reorder', async (_, { items }) => {
    const nodes = await reorderNodes(items)
    broadcastSync()
    return nodes
  })

  ipcMain.handle('entity:getAll', async () => {
    return getEntityNodes()
  })

  ipcMain.handle('entity:getById', async (_, { id }) => {
    return getNode(id)
  })

  ipcMain.handle('entity:importCharacterImage', async (_, { nodeId, sourcePath }) => {
    const relativePath = await importCharacterImage(nodeId, sourcePath)
    return { relativePath }
  })

  ipcMain.handle('entity:importEntityImage', async (_, { nodeId, sourcePath, entityType }) => {
    const relativePath = await importEntityImage(nodeId, sourcePath, entityType)
    return { relativePath }
  })

  ipcMain.handle('backup:list', async () => {
    const root = getProjectRootPath()
    if (!root) return []
    return listLocalBackups(root)
  })

  ipcMain.handle('tomes:forceQuit', async () => {
    isQuitting = true
    closeProject()
    app.quit()
    return { success: true }
  })

  ipcMain.handle('export:document', async (_, _options: ExportOptions) => {
    return { success: false, message: 'Export not yet implemented' }
  })

}

async function requestRendererFlush(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5000)

    ipcMain.handleOnce('app:flushComplete', async () => {
      clearTimeout(timeout)
      resolve()
      return { success: true }
    })

    mainWindow!.webContents.send('app:requestFlush')
  })
}

app.on('open-file', (event, path) => {
  event.preventDefault()
  if (mainWindow?.webContents.isLoading()) {
    pendingOpenPath = path
  } else if (mainWindow) {
    void openProjectFromPath(path)
  } else {
    pendingOpenPath = path
  }
})

app.on('before-quit', async (event) => {
  if (isQuitting || !isOpen()) return

  event.preventDefault()
  isQuitting = true

  await requestRendererFlush()
  const result = await saveProject()
  mainWindow?.webContents.send('tomes:beforeQuit', {
    unreachableBackupPaths: result.unreachableBackupPaths
  })

  if (result.unreachableBackupPaths.length > 0) {
    isQuitting = false
    return
  }

  closeProject()
  app.quit()
})

if (gotLock) {
  app.whenReady().then(() => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.priama.app')
    }

    const coldStartPath = findTomesPathInArgv(process.argv)
    if (coldStartPath) {
      pendingOpenPath = coldStartPath
    }

    registerAssetProtocol()
    registerIpcHandlers()
    buildMenu()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (!isQuitting) closeProject()
    if (process.platform !== 'darwin') app.quit()
  })
}
