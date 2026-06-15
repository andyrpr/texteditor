import { useAppStore } from '@/store/appStore'

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')

export function EditorTitleBar(): React.JSX.Element | null {
  const projectMeta = useAppStore((s) => s.projectMeta)
  if (!projectMeta) return null

  return (
    <div
      className="drag-region flex h-11 shrink-0 items-center border-b border-border bg-background"
      style={{ paddingLeft: isMac ? '78px' : '16px', paddingRight: '16px' }}
    >
      <div className="no-drag min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{projectMeta.title}</p>
        {projectMeta.author && (
          <p className="truncate text-xs text-muted-foreground leading-tight">{projectMeta.author}</p>
        )}
      </div>
    </div>
  )
}
