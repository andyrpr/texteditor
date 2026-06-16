import { contextBridge, ipcRenderer } from 'electron'
import type {
  BackupLocationStatus,
  ChapterStructure,
  CreateProjectInput,
  ExportOptions,
  NavigationSyncState,
  NodeType,
  PriamaConfig,
  PriamaPreferences,
  ProjectMeta,
  ProjectUiState,
  RecentProjectWithStatus,
  SaveResult,
  TreeNode,
  WindowLayoutState
} from '@shared/types'

export interface SyncState {
  path: string | null
  meta: ProjectMeta | null
  nodes: TreeNode[]
  uiState: ProjectUiState
}

export interface ElectronAPI {
  tomes: {
    createProject: (input: CreateProjectInput) => Promise<{ path: string; meta: ProjectMeta; projectRoot: string }>
    openProject: (path: string) => Promise<{ path: string; meta: ProjectMeta; nodes: TreeNode[]; uiState: ProjectUiState }>
    saveProject: () => Promise<SaveResult>
    closeProject: () => Promise<{ success: boolean }>
    getProjectInfo: () => Promise<{ path: string; meta: ProjectMeta } | null>
    getRecentProjects: () => Promise<RecentProjectWithStatus[]>
    removeFromRecent: (id: string) => Promise<{ success: boolean }>
    updateBackupLocations: (projectId: string, paths: string[]) => Promise<{ success: boolean }>
    checkBackupLocations: (paths: string[]) => Promise<BackupLocationStatus[]>
    getConfig: () => Promise<PriamaConfig>
    updatePreferences: (updates: Partial<PriamaPreferences>) => Promise<PriamaPreferences>
    updateRecentPath: (projectId: string, primaryPath: string) => Promise<{ success: boolean }>
    showInFolder: (path: string) => Promise<{ success: boolean }>
    forceQuit: () => Promise<{ success: boolean }>
    createChapter: (structure: ChapterStructure) => Promise<TreeNode>
    updateUiState: (uiState: ProjectUiState) => Promise<ProjectUiState>
    getSyncState: () => Promise<SyncState>
  }
  windows: {
    detach: (panel: 'sidebar' | 'entity') => Promise<{ success: boolean }>
    reattach: (panel: 'sidebar' | 'entity') => Promise<{ success: boolean }>
    openDocument: (nodeId: string, title: string) => Promise<{ success: boolean }>
    openImageViewer: (imagePath: string, title: string) => Promise<{ success: boolean }>
    getLayout: () => Promise<WindowLayoutState>
    updateLayout: (updates: Partial<WindowLayoutState>) => Promise<WindowLayoutState>
  }
  dialog: {
    openTomes: () => Promise<string | null>
    chooseFolder: (title?: string) => Promise<string | null>
    selectImage: () => Promise<string | null>
  }
  tree: {
    getAll: () => Promise<TreeNode[]>
    create: (parentId: string | null, type: NodeType, title: string) => Promise<TreeNode>
    update: (id: string, updates: Partial<Pick<TreeNode, 'title' | 'content' | 'metadata' | 'parentId' | 'sortOrder'>>) => Promise<TreeNode>
    delete: (id: string) => Promise<{ success: boolean }>
    reorder: (items: { id: string; parentId: string | null; sortOrder: number }[]) => Promise<TreeNode[]>
  }
  entity: {
    getAll: () => Promise<TreeNode[]>
    getById: (id: string) => Promise<TreeNode | null>
    importCharacterImage: (nodeId: string, sourcePath: string) => Promise<{ relativePath: string }>
    importEntityImage: (
      nodeId: string,
      sourcePath: string,
      entityType: 'character' | 'location'
    ) => Promise<{ relativePath: string }>
  }
  backup: {
    list: () => Promise<{ path: string; createdAt: string }[]>
  }
  export: {
    document: (options: ExportOptions) => Promise<{ success: boolean; message?: string; path?: string }>
  }
  navigation: {
    get: () => Promise<NavigationSyncState>
    update: (state: NavigationSyncState) => Promise<{ success: boolean }>
  }
  app: {
    notifyFlushComplete: () => Promise<{ success: boolean }>
  }
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
}

const api: ElectronAPI = {
  tomes: {
    createProject: (input) => ipcRenderer.invoke('tomes:createProject', input),
    openProject: (path) => ipcRenderer.invoke('tomes:openProject', { path }),
    saveProject: () => ipcRenderer.invoke('tomes:saveProject'),
    closeProject: () => ipcRenderer.invoke('tomes:closeProject'),
    getProjectInfo: () => ipcRenderer.invoke('tomes:getProjectInfo'),
    getRecentProjects: () => ipcRenderer.invoke('tomes:getRecentProjects'),
    removeFromRecent: (id) => ipcRenderer.invoke('tomes:removeFromRecent', { id }),
    updateBackupLocations: (projectId, paths) =>
      ipcRenderer.invoke('tomes:updateBackupLocations', { projectId, paths }),
    checkBackupLocations: (paths) => ipcRenderer.invoke('tomes:checkBackupLocations', { paths }),
    getConfig: () => ipcRenderer.invoke('tomes:getConfig'),
    updatePreferences: (updates) => ipcRenderer.invoke('tomes:updatePreferences', updates),
    updateRecentPath: (projectId, primaryPath) =>
      ipcRenderer.invoke('tomes:updateRecentPath', { projectId, primaryPath }),
    showInFolder: (path) => ipcRenderer.invoke('tomes:showInFolder', { path }),
    forceQuit: () => ipcRenderer.invoke('tomes:forceQuit'),
    createChapter: (structure) => ipcRenderer.invoke('tomes:createChapter', { structure }),
    updateUiState: (uiState) => ipcRenderer.invoke('tomes:updateUiState', uiState),
    getSyncState: () => ipcRenderer.invoke('tomes:getSyncState')
  },
  windows: {
    detach: (panel) => ipcRenderer.invoke('windows:detach', { panel }),
    reattach: (panel) => ipcRenderer.invoke('windows:reattach', { panel }),
    openDocument: (nodeId, title) => ipcRenderer.invoke('windows:openDocument', { nodeId, title }),
    openImageViewer: (imagePath, title) =>
      ipcRenderer.invoke('windows:openImageViewer', { imagePath, title }),
    getLayout: () => ipcRenderer.invoke('windows:getLayout'),
    updateLayout: (updates) => ipcRenderer.invoke('windows:updateLayout', updates)
  },
  dialog: {
    openTomes: () => ipcRenderer.invoke('dialog:openTomes'),
    chooseFolder: (title) => ipcRenderer.invoke('dialog:chooseFolder', title),
    selectImage: () => ipcRenderer.invoke('dialog:selectImage')
  },
  tree: {
    getAll: () => ipcRenderer.invoke('tree:getAll'),
    create: (parentId, type, title) => ipcRenderer.invoke('tree:create', { parentId, type, title }),
    update: (id, updates) => ipcRenderer.invoke('tree:update', { id, ...updates }),
    delete: (id) => ipcRenderer.invoke('tree:delete', { id }),
    reorder: (items) => ipcRenderer.invoke('tree:reorder', { items })
  },
  entity: {
    getAll: () => ipcRenderer.invoke('entity:getAll'),
    getById: (id) => ipcRenderer.invoke('entity:getById', { id }),
    importCharacterImage: (nodeId, sourcePath) =>
      ipcRenderer.invoke('entity:importCharacterImage', { nodeId, sourcePath }),
    importEntityImage: (nodeId, sourcePath, entityType) =>
      ipcRenderer.invoke('entity:importEntityImage', { nodeId, sourcePath, entityType })
  },
  backup: {
    list: () => ipcRenderer.invoke('backup:list')
  },
  export: {
    document: (options) => ipcRenderer.invoke('export:document', options)
  },
  navigation: {
    get: () => ipcRenderer.invoke('navigation:get'),
    update: (state) => ipcRenderer.invoke('navigation:update', state)
  },
  app: {
    notifyFlushComplete: () => ipcRenderer.invoke('app:flushComplete')
  },
  on: (channel, callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
