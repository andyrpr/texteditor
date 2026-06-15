import { useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { useToastStore } from '@/components/UI/toast'
import type { CreateProjectInput } from '@shared/types'

export function useProject(): {
  createProjectFromInput: (input: CreateProjectInput) => Promise<void>
  openProject: () => Promise<void>
  openProjectAtPath: (path: string) => Promise<void>
  saveProject: () => Promise<void>
  loadNodes: () => Promise<void>
  closeProject: () => Promise<void>
  removeFromRecent: (id: string) => Promise<void>
  locateProject: (projectId: string) => Promise<void>
} {
  const {
    setProject,
    closeProject: closeProjectStore,
    setNodes,
    setLastSaved,
    setSelectedNodeId,
    setBackupWarningCount,
    setSectionOrder
  } = useAppStore()
  const addToast = useToastStore((s) => s.addToast)

  const selectFirstNode = useCallback(
    (nodes: import('@shared/types').TreeNode[]) => {
      const chapters = nodes.filter((n) => n.type === 'chapter').sort((a, b) => a.sortOrder - b.sortOrder)
      if (chapters.length > 0) {
        const firstChapter = chapters[0]
        const scenes = nodes
          .filter((n) => n.parentId === firstChapter.id && n.type === 'scene')
          .sort((a, b) => a.sortOrder - b.sortOrder)
        setSelectedNodeId(scenes[0]?.id ?? firstChapter.id)
      }
    },
    [setSelectedNodeId]
  )

  const applySaveResult = useCallback(
    (result: import('@shared/types').SaveResult) => {
      if (result.success) {
        setLastSaved(result.lastSaved)
      }
      if (result.backupWarnings?.length) {
        for (const w of result.backupWarnings) {
          addToast(w.message, 'warning')
        }
      }
      if (result.unreachableBackupPaths?.length) {
        setBackupWarningCount(result.unreachableBackupPaths.length)
      } else {
        setBackupWarningCount(0)
      }
    },
    [setLastSaved, addToast, setBackupWarningCount]
  )

  const loadNodes = useCallback(async () => {
    const nodes = await window.electronAPI.tree.getAll()
    setNodes(nodes)
    selectFirstNode(nodes)
  }, [setNodes, selectFirstNode])

  const openProjectAtPath = useCallback(
    async (path: string) => {
      const result = await window.electronAPI.tomes.openProject(path)
      setProject(result.path, result.meta, result.nodes)
      if (result.uiState?.sectionOrder) {
        setSectionOrder(result.uiState.sectionOrder)
      }
      selectFirstNode(result.nodes)
      setLastSaved(result.meta.updatedAt)
      setBackupWarningCount(0)
    },
    [setProject, selectFirstNode, setLastSaved, setBackupWarningCount, setSectionOrder]
  )

  const createProjectFromInput = useCallback(
    async (input: CreateProjectInput) => {
      const result = await window.electronAPI.tomes.createProject(input)
      const openResult = await window.electronAPI.tomes.openProject(result.path)
      setProject(openResult.path, openResult.meta, openResult.nodes)
      if (openResult.uiState?.sectionOrder) {
        setSectionOrder(openResult.uiState.sectionOrder)
      }
      selectFirstNode(openResult.nodes)
      setLastSaved(openResult.meta.updatedAt)
    },
    [setProject, selectFirstNode, setLastSaved, setSectionOrder]
  )

  const openProject = useCallback(async () => {
    const path = await window.electronAPI.dialog.openTomes()
    if (!path) return
    await openProjectAtPath(path)
  }, [openProjectAtPath])

  const saveProject = useCallback(async () => {
    const result = await window.electronAPI.tomes.saveProject()
    applySaveResult(result)
  }, [applySaveResult])

  const closeProject = useCallback(async () => {
    await window.electronAPI.tomes.closeProject()
    closeProjectStore()
  }, [closeProjectStore])

  const removeFromRecent = useCallback(async (id: string) => {
    await window.electronAPI.tomes.removeFromRecent(id)
  }, [])

  const locateProject = useCallback(
    async (id: string) => {
      const path = await window.electronAPI.dialog.openTomes()
      if (!path) return
      await window.electronAPI.tomes.updateRecentPath(id, path)
      await openProjectAtPath(path)
    },
    [openProjectAtPath]
  )

  return {
    createProjectFromInput,
    openProject,
    openProjectAtPath,
    saveProject,
    loadNodes,
    closeProject,
    removeFromRecent,
    locateProject
  }
}
