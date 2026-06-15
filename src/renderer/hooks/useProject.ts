import { useCallback } from 'react'
import { useAppStore } from '@/store/appStore'

export function useProject(): {
  createProject: (title: string, author: string) => Promise<void>
  openProject: () => Promise<void>
  saveProject: () => Promise<void>
  loadNodes: () => Promise<void>
} {
  const { setProject, closeProject, setNodes, setLastSaved, setSelectedNodeId } = useAppStore()

  const loadNodes = useCallback(async () => {
    const nodes = await window.electronAPI.tree.getAll()
    setNodes(nodes)

    const chapters = nodes.filter((n) => n.type === 'chapter').sort((a, b) => a.sortOrder - b.sortOrder)
    if (chapters.length > 0) {
      const firstChapter = chapters[0]
      const scenes = nodes
        .filter((n) => n.parentId === firstChapter.id && n.type === 'scene')
        .sort((a, b) => a.sortOrder - b.sortOrder)
      setSelectedNodeId(scenes[0]?.id ?? firstChapter.id)
    }
  }, [setNodes, setSelectedNodeId])

  const createProject = useCallback(
    async (title: string, author: string) => {
      const path = await window.electronAPI.dialog.saveProjectAs(title)
      if (!path) return

      const result = await window.electronAPI.project.create(path, title, author)
      setProject(result.path, result.meta)
      await loadNodes()
      if (result.meta) {
        setLastSaved(new Date().toISOString())
      }
    },
    [setProject, loadNodes, setLastSaved]
  )

  const openProject = useCallback(async () => {
    const path = await window.electronAPI.dialog.openProject()
    if (!path) return

    const result = await window.electronAPI.project.open(path)
    setProject(result.path, result.meta)
    await loadNodes()
    setLastSaved(result.meta.updatedAt)
  }, [setProject, loadNodes, setLastSaved])

  const saveProject = useCallback(async () => {
    const result = await window.electronAPI.project.save()
    if (result.success) {
      setLastSaved(result.lastSaved)
    }
  }, [setLastSaved])

  return { createProject, openProject, saveProject, loadNodes }
}

export function useProjectMenuHandlers(
  createProject: (title: string, author: string) => Promise<void>,
  openProject: () => Promise<void>,
  saveProject: () => Promise<void>
): void {
  const { isProjectOpen } = useAppStore()

  useCallback(() => {
    const unsubNew = window.electronAPI.on('menu:newProject', () => {
      if (!isProjectOpen) return
      // Handled by welcome screen when no project open
    })
    const unsubOpen = window.electronAPI.on('menu:openProject', () => openProject())
    const unsubSave = window.electronAPI.on('menu:save', () => {
      if (isProjectOpen) saveProject()
    })
    return () => {
      unsubNew()
      unsubOpen()
      unsubSave()
    }
  }, [createProject, openProject, saveProject, isProjectOpen])
}
