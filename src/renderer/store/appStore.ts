import { create } from 'zustand'
import type { FolderScope, ProjectMeta, TreeNode, WikiEntityType } from '@shared/types'
import { DEFAULT_SECTION_ORDER, SIDEBAR_MAX_WIDTH } from '@shared/types'

interface AppState {
  projectPath: string | null
  projectId: string | null
  projectMeta: ProjectMeta | null
  isProjectOpen: boolean
  lastSaved: string | null
  isDirty: boolean
  backupWarningCount: number

  nodes: TreeNode[]
  selectedNodeId: string | null
  selectedContainerId: string | null
  expandedSections: Set<string>
  expandedFolders: Set<string>
  sectionOrder: string[]

  selectedEntityId: string | null
  selectedEntityType: WikiEntityType | null

  theme: 'light' | 'dark'
  sidebarWidth: number
  rightPanelWidth: number
  rightPanelOpen: boolean
  sidebarDetached: boolean
  entityDetached: boolean

  showNewProjectModal: boolean

  setProject: (path: string, meta: ProjectMeta, nodes?: TreeNode[]) => void
  closeProject: () => void
  setProjectMeta: (meta: ProjectMeta) => void
  setLastSaved: (timestamp: string) => void
  setDirty: (dirty: boolean) => void
  setBackupWarningCount: (count: number) => void

  setNodes: (nodes: TreeNode[]) => void
  addNode: (node: TreeNode) => void
  updateNodeInStore: (id: string, updates: Partial<TreeNode>) => void
  removeNode: (id: string) => void
  setSelectedNodeId: (id: string | null) => void
  selectContainer: (id: string | null) => void
  selectWikiEntity: (id: string | null, type: WikiEntityType | null) => void
  toggleSection: (section: string) => void
  toggleFolder: (folderId: string) => void
  setSectionOrder: (order: string[]) => void

  setSelectedEntity: (id: string | null, type: WikiEntityType | null) => void
  setTheme: (theme: 'light' | 'dark', options?: { persist?: boolean }) => void
  toggleTheme: () => void
  setRightPanelOpen: (open: boolean) => void
  setShowNewProjectModal: (show: boolean) => void
  setSidebarWidth: (width: number) => void
  setRightPanelWidth: (width: number) => void
  setSidebarDetached: (detached: boolean) => void
  setEntityDetached: (detached: boolean) => void
  applyNavigationSync: (nav: import('@shared/types').NavigationSyncState) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  projectPath: null,
  projectId: null,
  projectMeta: null,
  isProjectOpen: false,
  lastSaved: null,
  isDirty: false,
  backupWarningCount: 0,

  nodes: [],
  selectedNodeId: null,
  selectedContainerId: null,
  expandedSections: new Set(['manuscript', 'characters', 'locations', 'lore', 'notes']),
  expandedFolders: new Set<string>(),
  sectionOrder: [...DEFAULT_SECTION_ORDER],

  selectedEntityId: null,
  selectedEntityType: null,

  theme: 'dark',
  sidebarWidth: SIDEBAR_MAX_WIDTH,
  rightPanelWidth: 320,
  rightPanelOpen: true,
  sidebarDetached: false,
  entityDetached: false,
  showNewProjectModal: false,

  setProject: (path, meta, nodes) =>
    set({
      projectPath: path,
      projectId: meta.id,
      projectMeta: meta,
      isProjectOpen: true,
      isDirty: false,
      ...(nodes ? { nodes } : {})
    }),

  closeProject: () =>
    set({
      projectPath: null,
      projectId: null,
      projectMeta: null,
      isProjectOpen: false,
      nodes: [],
      selectedNodeId: null,
      selectedContainerId: null,
      selectedEntityId: null,
      selectedEntityType: null,
      expandedFolders: new Set(),
      isDirty: false,
      lastSaved: null,
      backupWarningCount: 0
    }),

  setProjectMeta: (meta) => set({ projectMeta: meta }),
  setLastSaved: (timestamp) => set({ lastSaved: timestamp, isDirty: false }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setBackupWarningCount: (count) => set({ backupWarningCount: count }),

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNodeInStore: (id, updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n))
    })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id && n.parentId !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      ...(s.selectedEntityId === id
        ? { selectedEntityId: null, selectedEntityType: null, rightPanelOpen: false }
        : {})
    })),
  setSelectedNodeId: (id) =>
    set({
      selectedNodeId: id,
      selectedContainerId: null,
      selectedEntityId: null,
      selectedEntityType: null,
      rightPanelOpen: false
    }),
  selectContainer: (id) =>
    set({
      selectedContainerId: id,
      selectedNodeId: null,
      selectedEntityId: null,
      selectedEntityType: null,
      rightPanelOpen: false
    }),
  selectWikiEntity: (id, type) => get().setSelectedEntity(id, type),
  toggleSection: (section) => {
    const expanded = new Set(get().expandedSections)
    if (expanded.has(section)) expanded.delete(section)
    else expanded.add(section)
    set({ expandedSections: expanded })
  },
  toggleFolder: (folderId) => {
    const expanded = new Set(get().expandedFolders)
    if (expanded.has(folderId)) expanded.delete(folderId)
    else expanded.add(folderId)
    set({ expandedFolders: expanded })
  },

  setSectionOrder: (order) => set({ sectionOrder: order }),

  setSelectedEntity: (id, type) => {
    const reopenPanel = id !== null
    if (reopenPanel && get().entityDetached) {
      void window.electronAPI.windows.updateLayout({ entityDetached: false })
      set({
        selectedEntityId: id,
        selectedEntityType: type,
        rightPanelOpen: true,
        entityDetached: false
      })
      return
    }
    set({
      selectedEntityId: id,
      selectedEntityType: type,
      rightPanelOpen: reopenPanel
    })
  },

  setTheme: (theme, options) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
    if (options?.persist !== false) {
      void window.electronAPI.tomes.updatePreferences({ theme })
    }
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setShowNewProjectModal: (show) => set({ showNewProjectModal: show }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
  setSidebarDetached: (detached) => set({ sidebarDetached: detached }),
  setEntityDetached: (detached) => set({ entityDetached: detached }),

  applyNavigationSync: (nav) =>
    set({
      selectedNodeId: nav.selectedNodeId,
      selectedContainerId: nav.selectedContainerId,
      selectedEntityId: nav.selectedEntityId,
      selectedEntityType: nav.selectedEntityType,
      expandedSections: new Set(nav.expandedSections),
      expandedFolders: new Set(nav.expandedFolders ?? []),
      rightPanelOpen: nav.rightPanelOpen,
      sectionOrder: nav.sectionOrder
    })
}))

export function getSelectedNode(state: AppState): TreeNode | null {
  if (!state.selectedNodeId) return null
  return state.nodes.find((n) => n.id === state.selectedNodeId) ?? null
}

export { getChapters, getScenes, getNodesByType, getActiveNodes } from '@/lib/treeUtils'
