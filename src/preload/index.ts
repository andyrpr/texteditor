import { contextBridge, ipcRenderer } from 'electron'
import type {
  ExportOptions,
  NodeType,
  ProjectInfo,
  SaveResult,
  TreeNode
} from '@shared/types'

export interface ElectronAPI {
  project: {
    create: (path: string, title: string, author: string) => Promise<{ path: string; meta: ProjectInfo['meta'] }>
    open: (path: string) => Promise<{ path: string; meta: ProjectInfo['meta'] }>
    close: () => Promise<{ success: boolean }>
    getInfo: () => Promise<ProjectInfo | null>
    save: () => Promise<SaveResult>
    updateMeta: (updates: { title?: string; author?: string }) => Promise<ProjectInfo['meta']>
  }
  dialog: {
    openProject: () => Promise<string | null>
    saveProjectAs: (defaultName?: string) => Promise<string | null>
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
  }
  backup: {
    list: () => Promise<{ path: string; createdAt: string }[]>
  }
  export: {
    document: (options: ExportOptions) => Promise<{ success: boolean; message?: string; path?: string }>
  }
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
}

const api: ElectronAPI = {
  project: {
    create: (path, title, author) => ipcRenderer.invoke('project:create', { path, title, author }),
    open: (path) => ipcRenderer.invoke('project:open', { path }),
    close: () => ipcRenderer.invoke('project:close'),
    getInfo: () => ipcRenderer.invoke('project:getInfo'),
    save: () => ipcRenderer.invoke('project:save'),
    updateMeta: (updates) => ipcRenderer.invoke('project:updateMeta', updates)
  },
  dialog: {
    openProject: () => ipcRenderer.invoke('dialog:openProject'),
    saveProjectAs: (defaultName) => ipcRenderer.invoke('dialog:saveProjectAs', defaultName),
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
    getById: (id) => ipcRenderer.invoke('entity:getById', { id })
  },
  backup: {
    list: () => ipcRenderer.invoke('backup:list')
  },
  export: {
    document: (options) => ipcRenderer.invoke('export:document', options)
  },
  on: (channel, callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
