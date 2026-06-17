import * as ContextMenu from '@radix-ui/react-context-menu'
import { ExternalLink, FolderInput, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { TreeNode } from '@shared/types'

export type TreeMenuVariant = 'manuscript' | 'wiki' | 'folder' | 'trash' | 'wikiRow'

interface TreeContextMenuProps {
  variant: TreeMenuVariant
  node?: TreeNode
  onRename?: () => void
  onMoveTo?: () => void
  onOpenNewWindow?: () => void
  onMoveToTrash?: () => void
  onRecover?: () => void
  onPermanentDelete?: () => void
  children: React.ReactNode
}

export function TreeContextMenu({
  variant,
  node,
  onRename,
  onMoveTo,
  onOpenNewWindow,
  onMoveToTrash,
  onRecover,
  onPermanentDelete,
  children
}: TreeContextMenuProps): React.JSX.Element {
  const isScene = node?.type === 'scene'
  const isTrash = variant === 'trash'

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {isTrash ? (
            <>
              <ContextMenu.Item
                className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onSelect={onRecover}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Recover
              </ContextMenu.Item>
              <ContextMenu.Separator className="my-1 h-px bg-border" />
              <ContextMenu.Item
                className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
                onSelect={onPermanentDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete permanently
              </ContextMenu.Item>
            </>
          ) : (
            <>
              {onRename && (
                <ContextMenu.Item
                  className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  onSelect={onRename}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Rename
                </ContextMenu.Item>
              )}
              {isScene && onMoveTo && (
                <ContextMenu.Item
                  className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  onSelect={onMoveTo}
                >
                  <FolderInput className="mr-2 h-3.5 w-3.5" />
                  Move to…
                </ContextMenu.Item>
              )}
              {onOpenNewWindow && variant !== 'folder' && (
                <ContextMenu.Item
                  className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  onSelect={onOpenNewWindow}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Open in new window
                </ContextMenu.Item>
              )}
              {(onRename || onMoveTo || onOpenNewWindow) && onMoveToTrash && (
                <ContextMenu.Separator className="my-1 h-px bg-border" />
              )}
              {onMoveToTrash && (
                <ContextMenu.Item
                  className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
                  onSelect={onMoveToTrash}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Move to trash
                </ContextMenu.Item>
              )}
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

interface EmptyAreaContextMenuProps {
  items: { label: string; onSelect: () => void; destructive?: boolean }[]
  children: React.ReactNode
}

export function EmptyAreaContextMenu({
  items,
  children
}: EmptyAreaContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[200px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {items.map((item, i) => (
            <ContextMenu.Item
              key={item.label}
              className={`flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent ${
                item.destructive ? 'text-destructive' : ''
              }`}
              onSelect={item.onSelect}
            >
              {item.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
