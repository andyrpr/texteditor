import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { RichTextEditor } from '@/components/Editor/RichTextEditor'
import { EntityPanel } from '@/components/Wiki/EntityPanel'
import { EditorTitleBar } from '@/components/Editor/EditorTitleBar'
import { StatusBar } from '@/components/UI/StatusBar'
import { RecentProjectsScreen } from '@/components/Project/RecentProjectsScreen'
import { QuitWarningModal } from '@/components/Project/QuitWarningModal'
import { Toaster } from '@/components/UI/toast'
import { useProject } from '@/hooks/useProject'
import { useSyncFromMain, hydrateFromMain } from '@/hooks/useSync'
import { useThemeSync } from '@/hooks/useThemeSync'
import { isWorkspaceWindow } from '@/lib/hashParams'
import { useSearchParams } from '@/lib/hashParams'
import { SIDEBAR_MAX_WIDTH } from '@shared/types'

export function AppLayout(): React.JSX.Element {
  const {
    isProjectOpen,
    nodes,
    selectedNodeId,
    sidebarDetached,
    entityDetached,
    sidebarWidth,
    rightPanelWidth,
    setShowNewProjectModal,
    setSidebarWidth,
    setRightPanelWidth,
    setSidebarDetached,
    setEntityDetached,
    setSelectedNodeId
  } = useAppStore()
  const { openProject, saveProject } = useProject()
  const params = useSearchParams()
  const isSecondary = isWorkspaceWindow()

  const [quitWarningPaths, setQuitWarningPaths] = useState<string[]>([])
  const [secondaryHydrated, setSecondaryHydrated] = useState(!isSecondary)
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  useSyncFromMain()
  useThemeSync()

  useEffect(() => {
    if (!isSecondary) return
    const nodeId = params.get('nodeId')
    void hydrateFromMain().then(() => {
      if (nodeId) setSelectedNodeId(nodeId)
      setSecondaryHydrated(true)
    })
  }, [isSecondary, params, setSelectedNodeId])

  useEffect(() => {
    if (isSecondary) return
    void window.electronAPI.tomes.getConfig().then((config) => {
      const layout = config.windowLayout
      if (layout) {
        setSidebarWidth(layout.sidebarWidth ?? SIDEBAR_MAX_WIDTH)
        setRightPanelWidth(layout.rightPanelWidth ?? 320)
        setSidebarDetached(layout.sidebarDetached ?? false)
        setEntityDetached(layout.entityDetached ?? false)
      }
    })
  }, [isSecondary, setSidebarWidth, setRightPanelWidth, setSidebarDetached, setEntityDetached])

  useEffect(() => {
    const unsubOpen = window.electronAPI.on('menu:openProject', () => openProject())
    const unsubSave = window.electronAPI.on('menu:save', () => {
      if (isProjectOpen) saveProject()
    })
    const unsubNew = window.electronAPI.on('menu:newProject', () => {
      if (!isProjectOpen && !isSecondary) setShowNewProjectModal(true)
    })
    const unsubOpened = window.electronAPI.on('tomes:projectOpened', (data: unknown) => {
      if (isSecondary) return
      const result = data as {
        path: string
        meta: import('@shared/types').ProjectMeta
        nodes: import('@shared/types').TreeNode[]
        uiState?: import('@shared/types').ProjectUiState
      }
      useAppStore.getState().setProject(result.path, result.meta, result.nodes)
      if (result.uiState?.sectionOrder) {
        useAppStore.getState().setSectionOrder(result.uiState.sectionOrder)
      }
      const chapters = result.nodes.filter((n) => n.type === 'chapter').sort((a, b) => a.sortOrder - b.sortOrder)
      if (chapters.length > 0) {
        const scenes = result.nodes
          .filter((n) => n.parentId === chapters[0].id && n.type === 'scene')
          .sort((a, b) => a.sortOrder - b.sortOrder)
        useAppStore.getState().setSelectedNodeId(scenes[0]?.id ?? chapters[0].id)
      }
      useAppStore.getState().setLastSaved(result.meta.updatedAt)
    })
    const unsubBeforeQuit = window.electronAPI.on('tomes:beforeQuit', (data: unknown) => {
      const { unreachableBackupPaths } = data as { unreachableBackupPaths: string[] }
      if (unreachableBackupPaths.length > 0) {
        setQuitWarningPaths(unreachableBackupPaths)
      }
    })
    const unsubPanelReattached = window.electronAPI.on('windows:panelReattached', (data: unknown) => {
      const { panel } = data as { panel: 'sidebar' | 'entity' }
      if (panel === 'sidebar') setSidebarDetached(false)
      if (panel === 'entity') setEntityDetached(false)
    })
    return () => {
      unsubOpen()
      unsubSave()
      unsubNew()
      unsubOpened()
      unsubBeforeQuit()
      unsubPanelReattached()
    }
  }, [
    openProject,
    saveProject,
    isProjectOpen,
    isSecondary,
    setShowNewProjectModal,
    setSidebarDetached,
    setEntityDetached
  ])

  useEffect(() => {
    const node = nodes.find((n) => n.id === selectedNodeId)
    if (node && ['character', 'location', 'lore', 'note'].includes(node.type)) {
      useAppStore.getState().setRightPanelOpen(true)
    }
  }, [selectedNodeId, nodes])

  if (isSecondary && !secondaryHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  if (!isProjectOpen) {
    return (
      <>
        <RecentProjectsScreen />
        <Toaster />
      </>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        {sidebarDetached ? (
          <div
            className="shrink-0 border-r border-sidebar-border bg-sidebar"
            style={{ width: sidebarWidth }}
            aria-hidden
          />
        ) : (
          <Sidebar />
        )}
        <main className="flex flex-1 flex-col overflow-hidden bg-background">
          <EditorTitleBar />
          <RichTextEditor node={selectedNode} />
        </main>
        {entityDetached ? (
          <div
            className="shrink-0 border-l border-border bg-card"
            style={{ width: rightPanelWidth }}
            aria-hidden
          />
        ) : (
          <EntityPanel />
        )}
      </div>
      <StatusBar />
      <Toaster />
      {!isSecondary && (
        <QuitWarningModal
          open={quitWarningPaths.length > 0}
          unreachablePaths={quitWarningPaths}
          onCancel={() => setQuitWarningPaths([])}
          onQuitAnyway={async () => {
            setQuitWarningPaths([])
            await window.electronAPI.tomes.forceQuit()
          }}
        />
      )}
    </div>
  )
}
