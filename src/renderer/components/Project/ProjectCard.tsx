import { formatDistanceToNow } from 'date-fns'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { AlertCircle } from 'lucide-react'
import type { RecentProjectWithStatus } from '@shared/types'
import { truncatePath } from '@shared/pathUtils'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: RecentProjectWithStatus
  onOpen: () => void
  onShowInFolder: () => void
  onRemove: () => void
}

export function ProjectCard({
  project,
  onOpen,
  onShowInFolder,
  onRemove
}: ProjectCardProps): React.JSX.Element {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const lastOpened = formatDistanceToNow(new Date(project.lastOpened), { addSuffix: true })

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <button
          onClick={() => project.exists && onOpen()}
          disabled={!project.exists}
          className={cn(
            'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-md',
            !project.exists && 'cursor-not-allowed opacity-60'
          )}
        >
          <div className="h-24 w-full" style={{ backgroundColor: project.coverColor }} />
          <div className="flex flex-1 flex-col gap-1 p-4">
            <h3 className="truncate font-semibold">{project.title}</h3>
            <p className="truncate text-xs text-muted-foreground">{project.author || 'Unknown author'}</p>
            <p className="text-xs text-muted-foreground">{lastOpened}</p>
            <p className="truncate text-xs text-muted-foreground/70">
              {truncatePath(project.primaryPath, 35)}
            </p>
          </div>
          {!project.exists && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-destructive/90 px-2 py-0.5 text-xs text-white">
              <AlertCircle className="h-3 w-3" />
              Not Found
            </div>
          )}
        </button>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <ContextMenu.Item
            className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent disabled:opacity-50"
            disabled={!project.exists}
            onSelect={onOpen}
          >
            Open
          </ContextMenu.Item>
          <ContextMenu.Item
            className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onSelect={onShowInFolder}
          >
            {isMac ? 'Show in Finder' : 'Show in Explorer'}
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
            onSelect={onRemove}
          >
            Remove from Recent
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
