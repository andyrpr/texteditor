import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { RichTextEditor } from '@/components/Editor/RichTextEditor'
import { EntityPanel } from '@/components/Wiki/EntityPanel'
import { StatusBar } from '@/components/UI/StatusBar'
import { WelcomeScreen } from '@/components/UI/WelcomeScreen'
import { useProject } from '@/hooks/useProject'

export function AppLayout(): React.JSX.Element {
  const { isProjectOpen, nodes, selectedNodeId, setTheme, theme } = useAppStore()
  const { openProject, saveProject } = useProject()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const unsubOpen = window.electronAPI.on('menu:openProject', () => openProject())
    const unsubSave = window.electronAPI.on('menu:save', () => {
      if (isProjectOpen) saveProject()
    })
    const unsubNew = window.electronAPI.on('menu:newProject', () => {
      // Welcome screen handles new projects when none open
    })
    return () => {
      unsubOpen()
      unsubSave()
      unsubNew()
    }
  }, [openProject, saveProject, isProjectOpen])

  useEffect(() => {
    const node = nodes.find((n) => n.id === selectedNodeId)
    if (node && ['character', 'location', 'lore', 'note'].includes(node.type)) {
      useAppStore.getState().setRightPanelOpen(true)
    }
  }, [selectedNodeId, nodes])

  if (!isProjectOpen) {
    return <WelcomeScreen />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden bg-background">
          <RichTextEditor node={selectedNode} />
        </main>
        <EntityPanel />
      </div>
      <StatusBar />
    </div>
  )
}
