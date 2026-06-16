import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import type { WindowBounds, WindowLayoutState } from '@shared/types'
import { getNavigationState } from './navigationState'
import { getSyncState } from './tomes/projectStore'

export type PanelType = 'sidebar' | 'entity'
export type ChildWindowKind = PanelType | 'workspace' | 'imageViewer'

interface ChildWindowRecord {
  window: BrowserWindow
  kind: ChildWindowKind
  nodeId?: string
  imagePath?: string
  ownerWindowId: number
  panel?: PanelType
}

const children = new Map<string, ChildWindowRecord>()
const reattachingPanels = new Set<string>()
let mainWindowRef: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindowRef = win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindowRef
}

export function themeBackground(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '#1a1a1a' : '#fafafa'
}

function panelKey(ownerWindowId: number, panel: PanelType): string {
  return `${ownerWindowId}:${panel}`
}

function loadUrl(win: BrowserWindow, hash: string): void {
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hash}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

function defaultBounds(width: number, height: number): WindowBounds {
  const display = screen.getPrimaryDisplay().workArea
  return {
    x: display.x + 40,
    y: display.y + 40,
    width,
    height
  }
}

function getOwnerWindow(ownerWindowId: number): BrowserWindow | null {
  const win = BrowserWindow.fromId(ownerWindowId)
  return win && !win.isDestroyed() ? win : null
}

export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

function pushPanelStateToChild(win: BrowserWindow): void {
  win.webContents.once('did-finish-load', () => {
    if (win.isDestroyed()) return
    win.webContents.send('sync:navigation', getNavigationState())
    win.webContents.send('sync:state', getSyncState())
  })
}

export function detachPanel(
  panel: PanelType,
  ownerWindow: BrowserWindow,
  theme: 'light' | 'dark',
  bounds?: WindowBounds
): BrowserWindow {
  const ownerWindowId = ownerWindow.id
  const existing = [...children.entries()].find(
    ([, r]) => r.kind === panel && r.ownerWindowId === ownerWindowId
  )
  if (existing) {
    existing[1].window.focus()
    return existing[1].window
  }

  const b = bounds ?? defaultBounds(panel === 'sidebar' ? 300 : 360, 700)
  const win = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    minWidth: 200,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    movable: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    show: false,
    backgroundColor: themeBackground(theme),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const id = win.id.toString()
  children.set(id, { window: win, kind: panel, ownerWindowId, panel })

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    children.delete(id)
    const key = panelKey(ownerWindowId, panel)
    if (!reattachingPanels.has(key)) {
      getOwnerWindow(ownerWindowId)?.webContents.send('windows:panelClosed', { panel })
    }
    reattachingPanels.delete(key)
  })

  loadUrl(win, `child=${panel}`)
  pushPanelStateToChild(win)
  return win
}

export function getPanelOwnerWindowId(sourceWindow: BrowserWindow, panel: PanelType): number | undefined {
  const record = [...children.values()].find(
    (r) => r.window.id === sourceWindow.id && r.kind === panel
  )
  return record?.ownerWindowId
}

export function reattachPanel(panel: PanelType, sourceWindow: BrowserWindow): void {
  const entry = [...children.entries()].find(
    ([, r]) => r.window.id === sourceWindow.id && r.kind === panel
  )
  if (!entry) return

  const { ownerWindowId } = entry[1]
  const key = panelKey(ownerWindowId, panel)
  reattachingPanels.add(key)
  const win = entry[1].window
  if (!win.isDestroyed()) {
    win.setClosable(true)
    win.close()
  }
  children.delete(entry[0])
  getOwnerWindow(ownerWindowId)?.webContents.send('windows:panelReattached', { panel })
}

export function openDocumentWindow(
  nodeId: string,
  title: string,
  theme: 'light' | 'dark',
  bounds?: WindowBounds
): BrowserWindow {
  const existing = [...children.entries()].find(
    ([, r]) => r.kind === 'workspace' && r.nodeId === nodeId
  )
  if (existing) {
    existing[1].window.focus()
    return existing[1].window
  }

  const b = bounds ?? defaultBounds(1400, 900)
  const win = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    minWidth: 900,
    minHeight: 600,
    title: `Priama — ${title}`,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    backgroundColor: themeBackground(theme),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const id = win.id.toString()
  children.set(id, { window: win, kind: 'workspace', nodeId, ownerWindowId: win.id })

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    children.delete(id)
    saveSecondaryWindowState()
  })

  loadUrl(win, `child=workspace&nodeId=${encodeURIComponent(nodeId)}`)
  return win
}

export function openImageViewerWindow(
  imagePath: string,
  title: string,
  theme: 'light' | 'dark'
): BrowserWindow {
  const existing = [...children.entries()].find(
    ([, r]) => r.kind === 'imageViewer' && r.imagePath === imagePath
  )
  if (existing) {
    existing[1].window.setTitle(title)
    existing[1].window.focus()
    return existing[1].window
  }

  const b = defaultBounds(720, 480)
  const win = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    minWidth: 320,
    minHeight: 240,
    title,
    show: false,
    backgroundColor: themeBackground(theme),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const id = win.id.toString()
  children.set(id, {
    window: win,
    kind: 'imageViewer',
    imagePath,
    ownerWindowId: win.id
  })

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    children.delete(id)
  })

  const hash = `child=imageViewer&imagePath=${encodeURIComponent(imagePath)}&title=${encodeURIComponent(title)}`
  loadUrl(win, hash)
  return win
}

export function saveSecondaryWindowState(): WindowLayoutState['secondaryWindows'] {
  const secondary: WindowLayoutState['secondaryWindows'] = []
  for (const [, record] of children) {
    if (record.kind === 'workspace' && record.nodeId && !record.window.isDestroyed()) {
      const b = record.window.getBounds()
      secondary.push({
        nodeId: record.nodeId,
        bounds: { x: b.x, y: b.y, width: b.width, height: b.height }
      })
    }
  }
  return secondary
}

export function closeAllChildren(): void {
  for (const [, record] of children) {
    if (!record.window.isDestroyed()) record.window.close()
  }
  children.clear()
}
