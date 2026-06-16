import { useEffect } from 'react'
import { useSearchParams } from '@/lib/hashParams'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { EntityPanel } from '@/components/Wiki/EntityPanel'
import { Button } from '@/components/UI/button'
import { useSyncFromMain, hydrateFromMain } from '@/hooks/useSync'
import { useNavigationSync, useNavigationSyncPublisher } from '@/hooks/useNavigationSync'
import { useThemeSync } from '@/hooks/useThemeSync'
import { PanelRightOpen } from 'lucide-react'

const PANEL_LABELS: Record<string, string> = {
  sidebar: 'Manuscript',
  entity: 'Details'
}

export function ChildWindowRoot(): React.JSX.Element {
  const params = useSearchParams()
  const child = params.get('child')

  useSyncFromMain()
  useThemeSync()
  useNavigationSync()
  useNavigationSyncPublisher(true)

  useEffect(() => {
    void hydrateFromMain()
  }, [])

  const handleReattach = (): void => {
    if (child === 'sidebar' || child === 'entity') {
      void window.electronAPI.windows.reattach(child)
    }
  }

  if (child === 'sidebar') {
    return (
      <div className="flex h-screen flex-col bg-sidebar">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-sidebar-border px-3 drag-region">
          <span className="no-drag text-xs font-medium">{PANEL_LABELS.sidebar}</span>
          <Button variant="ghost" size="icon" className="no-drag h-7 w-7" onClick={handleReattach} title="Reattach">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
        <Sidebar detached />
      </div>
    )
  }

  if (child === 'entity') {
    return (
      <div className="flex h-screen flex-col bg-card">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3 drag-region">
          <span className="no-drag text-xs font-medium">{PANEL_LABELS.entity}</span>
          <Button variant="ghost" size="icon" className="no-drag h-7 w-7" onClick={handleReattach} title="Reattach">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
        <EntityPanel detached />
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      <p>Unknown window type</p>
    </div>
  )
}
