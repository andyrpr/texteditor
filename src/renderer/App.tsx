import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { EditorPane } from '@/components/Editor/EditorPane'
import { EntityPanel } from '@/components/Wiki/EntityPanel'
import { StatusBar } from '@/components/UI/StatusBar'
import { ExportDialog } from '@/components/Export/ExportDialog'
import { RecentProjectsScreen } from '@/components/Project/RecentProjectsScreen'
import { QuitWarningModal } from '@/components/Project/QuitWarningModal'
import { Toaster } from '@/components/UI/toast'
import { useProject } from '@/hooks/useProject'
import { useContentPersistence } from '@/hooks/useContentPersistence'
import { useNavigationSync, useNavigationSyncPublisher, hydrateNavigationFromMain } from '@/hooks/useNavigationSync'
import { useSyncFromMain, hydrateFromMain } from '@/hooks/useSync'
import { useThemeSync } from '@/hooks/useThemeSync'
import { isWorkspaceWindow } from '@/lib/hashParams'
import { useSearchParams } from '@/lib/hashParams'
import { SIDEBAR_MAX_WIDTH, RIGHT_PANEL_MIN_WIDTH, RIGHT_PANEL_MAX_WIDTH } from '@shared/types'

export function AppLayout(): React.JSX.Element {
  const {
    isProjectOpen,
    sidebarDetached,
    entityDetached,
    setShowNewProjectModal,
    showExportDialog,
    setShowExportDialog,
    setSidebarWidth,
    setRightPanelWidth,
    setSidebarDetached,
    setEntityDetached,
    setSelectedNodeId
  } = useAppStore()
  const params = useSearchParams()
  const isSecondary = isWorkspaceWindow()
  const { openProject } = useProject()
  useContentPersistence(isProjectOpen && !isSecondary)

  const [quitWarningPaths, setQuitWarningPaths] = useState<string[]>([])
  const [secondaryHydrated, setSecondaryHydrated] = useState(!isSecondary)

  useSyncFromMain()
  useThemeSync()
  useNavigationSync()
  useNavigationSyncPublisher(isProjectOpen && !isSecondary)

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
    void window.electronAPI.windows.getLayout().then((layout) => {
      setSidebarWidth(layout.sidebarWidth ?? SIDEBAR_MAX_WIDTH)
      setRightPanelWidth(
        Math.min(
          RIGHT_PANEL_MAX_WIDTH,
          Math.max(RIGHT_PANEL_MIN_WIDTH, layout.rightPanelWidth ?? RIGHT_PANEL_MIN_WIDTH)
        )
      )
      setSidebarDetached(layout.sidebarDetached ?? false)
      setEntityDetached(layout.entityDetached ?? false)
    })
  }, [isSecondary, setSidebarWidth, setRightPanelWidth, setSidebarDetached, setEntityDetached])

  useEffect(() => {
    const unsubOpen = window.electronAPI.on('menu:openProject', () => openProject())
    const unsubNew = window.electronAPI.on('menu:newProject', () => {
      if (!isProjectOpen && !isSecondary) setShowNewProjectModal(true)
    })
    const unsubExport = window.electronAPI.on('menu:export', () => {
      if (isProjectOpen && !isSecondary) setShowExportDialog(true)
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
      void hydrateNavigationFromMain()
    })
    const unsubPanelClosed = window.electronAPI.on('windows:panelClosed', (data: unknown) => {
      const { panel } = data as { panel: 'sidebar' | 'entity' }
      if (panel === 'sidebar') {
        setSidebarDetached(false)
        void window.electronAPI.windows.updateLayout({ sidebarDetached: false })
      }
      if (panel === 'entity') {
        setEntityDetached(false)
        void window.electronAPI.windows.updateLayout({ entityDetached: false })
      }
    })
    return () => {
      unsubOpen()
      unsubNew()
      unsubExport()
      unsubOpened()
      unsubBeforeQuit()
      unsubPanelReattached()
      unsubPanelClosed()
    }
  }, [
    openProject,
    isSecondary,
    setShowNewProjectModal,
    setShowExportDialog,
    isProjectOpen,
    setSidebarDetached,
    setEntityDetached
  ])

  if (isSecondary && !secondaryHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  if (!isProjectOpen) {
    return (
      <div className="launch-screen h-screen overflow-hidden bg-[var(--launch-bg)]">
        <RecentProjectsScreen />
        <Toaster />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        {!sidebarDetached && <Sidebar />}
        <main className="drag-region flex flex-1 flex-col overflow-hidden bg-background">
          <EditorPane />
        </main>
        {!entityDetached && <EntityPanel />}
      </div>
      <StatusBar />
      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
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
