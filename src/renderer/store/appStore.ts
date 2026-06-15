import { create } from 'zustand'
import type { EntityType, ProjectMeta, TreeNode } from '@shared/types'

interface AppState {
  // Project
  projectPath: string | null
  projectMeta: ProjectMeta | null
  isProjectOpen: boolean
  lastSaved: string | null
  isDirty: boolean

  // Tree
  nodes: TreeNode[]
  selectedNodeId: string | null
  expandedSections: Set<string>

  // Entity panel
  selectedEntityId: string | null
  selectedEntityType: EntityType | null

  // UI
  theme: 'light' | 'dark'
  sidebarWidth: number
  rightPanelWidth: number
  rightPanelOpen: boolean

  // Actions
  setProject: (path: string, meta: ProjectMeta) => void
  closeProject: () => void
  setProjectMeta: (meta: ProjectMeta) => void
  setLastSaved: (timestamp: string) => void
  setDirty: (dirty: boolean) => void

  setNodes: (nodes: TreeNode[]) => void
  addNode: (node: TreeNode) => void
  updateNodeInStore: (id: string, updates: Partial<TreeNode>) => void
  removeNode: (id: string) => void
  setSelectedNodeId: (id: string | null) => void
  toggleSection: (section: string) => void

  setSelectedEntity: (id: string | null, type: EntityType | null) => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setRightPanelOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  projectPath: null,
  projectMeta: null,
  isProjectOpen: false,
  lastSaved: null,
  isDirty: false,

  nodes: [],
  selectedNodeId: null,
  expandedSections: new Set(['manuscript', 'characters', 'locations', 'lore', 'notes']),

  selectedEntityId: null,
  selectedEntityType: null,

  theme: 'dark',
  sidebarWidth: 260,
  rightPanelWidth: 320,
  rightPanelOpen: true,

  setProject: (path, meta) =>
    set({ projectPath: path, projectMeta: meta, isProjectOpen: true, isDirty: false }),

  closeProject: () =>
    set({
      projectPath: null,
      projectMeta: null,
      isProjectOpen: false,
      nodes: [],
      selectedNodeId: null,
      selectedEntityId: null,
      selectedEntityType: null,
      isDirty: false,
      lastSaved: null
    }),

  setProjectMeta: (meta) => set({ projectMeta: meta }),
  setLastSaved: (timestamp) => set({ lastSaved: timestamp, isDirty: false }),
  setDirty: (dirty) => set({ isDirty: dirty }),

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNodeInStore: (id, updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n))
    })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id && n.parentId !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId
    })),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  toggleSection: (section) => {
    const expanded = new Set(get().expandedSections)
    if (expanded.has(section)) expanded.delete(section)
    else expanded.add(section)
    set({ expandedSections: expanded })
  },

  setSelectedEntity: (id, type) =>
    set({ selectedEntityId: id, selectedEntityType: type, rightPanelOpen: id !== null }),

  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
  setRightPanelOpen: (open) => set({ rightPanelOpen: open })
}))

export function getSelectedNode(state: AppState): TreeNode | null {
  if (!state.selectedNodeId) return null
  return state.nodes.find((n) => n.id === state.selectedNodeId) ?? null
}

export function getChapters(nodes: TreeNode[]): TreeNode[] {
  return nodes.filter((n) => n.type === 'chapter').sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getScenes(nodes: TreeNode[], chapterId: string): TreeNode[] {
  return nodes
    .filter((n) => n.parentId === chapterId && n.type === 'scene')
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getNodesByType(nodes: TreeNode[], type: TreeNode['type']): TreeNode[] {
  return nodes.filter((n) => n.type === type).sort((a, b) => a.sortOrder - b.sortOrder)
}
