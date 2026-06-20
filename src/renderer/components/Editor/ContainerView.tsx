import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Folder, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { countNodeWords, isFolder, stripNodeContentPreview } from '@/lib/treeUtils'
import { useAppStore } from '@/store/appStore'
import { useHistoryStore } from '@/store/historyStore'
import { makeRenameCommand } from '@/lib/commands'
import { TreeContextMenu, EmptyAreaContextMenu } from '@/components/Tree/TreeContextMenu'
import { ConfirmDialog } from '@/components/UI/ConfirmDialog'
import type { TreeNode } from '@shared/types'

interface ContainerViewProps {
  title: string
  subtitle?: string
  items: TreeNode[]
  emptyMessage: string
  selectedNodeId: string | null
  onSelect: (node: TreeNode) => void
  onReorder?: (items: TreeNode[]) => void
  readOnly?: boolean
  menuVariant?: 'manuscript' | 'wiki' | 'trash'
  onRename?: (node: TreeNode) => void
  onMoveTo?: (node: TreeNode) => void
  onOpenNewWindow?: (node: TreeNode) => void
  onMoveToTrash?: (node: TreeNode) => void
  onRecover?: (node: TreeNode) => void
  onPermanentDelete?: (node: TreeNode) => void
  emptyMenuItems?: { label: string; onSelect: () => void }[]
}

interface ConfirmState {
  title: string
  description: string
  destructive?: boolean
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
}

function SortableCard({
  node,
  isSelected,
  readOnly,
  menuVariant = 'manuscript',
  renaming,
  renameValue,
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onSelect,
  onRename,
  onMoveTo,
  onOpenNewWindow,
  onMoveToTrash,
  onRecover,
  onPermanentDelete,
  onConfirm
}: {
  node: TreeNode
  isSelected: boolean
  readOnly?: boolean
  menuVariant?: 'manuscript' | 'wiki' | 'trash'
  renaming?: boolean
  renameValue?: string
  onRenameValueChange?: (value: string) => void
  onRenameCommit?: () => void
  onRenameCancel?: () => void
  onSelect: () => void
  onRename?: () => void
  onMoveTo?: () => void
  onOpenNewWindow?: () => void
  onMoveToTrash?: () => void
  onRecover?: () => void
  onPermanentDelete?: () => void
  onConfirm: (state: ConfirmState) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: readOnly
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const words = countNodeWords(node)
  const preview = stripNodeContentPreview(node)
  const folderNode = isFolder(node)

  const card = (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'no-drag group relative flex flex-col rounded-lg border bg-card p-4 shadow-sm transition-colors',
        renaming ? 'cursor-default' : 'cursor-pointer',
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50 hover:bg-accent/30',
        isDragging && 'opacity-50 z-10'
      )}
      onClick={renaming ? undefined : onSelect}
    >
      {!readOnly && !renaming && (
        <button
          type="button"
          className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 cursor-grab touch-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <div className="flex items-start gap-2 pr-8">
        {folderNode && <Folder className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
        {renaming ? (
          <input
            autoFocus
            value={renameValue ?? node.title}
            onChange={(e) => onRenameValueChange?.(e.target.value)}
            onBlur={() => onRenameCommit?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameCommit?.()
              if (e.key === 'Escape') onRenameCancel?.()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm font-medium"
          />
        ) : (
          <h3 className="font-medium leading-snug">{node.title}</h3>
        )}
      </div>
      {!renaming && (
        <>
          <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">{preview}</p>
          {words > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {words.toLocaleString()} {words === 1 ? 'word' : 'words'}
            </p>
          )}
        </>
      )}
    </div>
  )

  if (renaming) return card

  if (readOnly && menuVariant === 'trash') {
    return (
      <TreeContextMenu
        variant="trash"
        node={node}
        onRecover={onRecover}
        onPermanentDelete={() =>
          onConfirm({
            title: 'Delete permanently?',
            description: `This will permanently delete "${node.title}". This action cannot be undone.`,
            destructive: true,
            confirmLabel: 'Delete permanently',
            onConfirm: () => onPermanentDelete?.()
          })
        }
      >
        {card}
      </TreeContextMenu>
    )
  }

  if (readOnly) return card

  return (
    <TreeContextMenu
      variant={menuVariant}
      node={node}
      onRename={onRename}
      onMoveTo={node.type === 'scene' ? onMoveTo : undefined}
      onOpenNewWindow={folderNode ? undefined : onOpenNewWindow}
      onMoveToTrash={() =>
        onConfirm({
          title: 'Move to trash?',
          description: `Are you sure you want to move "${node.title}" to trash? You can recover it within 50 days.`,
          destructive: true,
          confirmLabel: 'Move to trash',
          onConfirm: () => onMoveToTrash?.()
        })
      }
    >
      {card}
    </TreeContextMenu>
  )
}

export function ContainerView({
  title,
  subtitle,
  items,
  emptyMessage,
  selectedNodeId,
  onSelect,
  onReorder,
  readOnly = false,
  menuVariant = 'manuscript',
  onRename,
  onMoveTo,
  onOpenNewWindow,
  onMoveToTrash,
  onRecover,
  onPermanentDelete,
  emptyMenuItems
}: ContainerViewProps): React.JSX.Element {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const pendingRenameNodeId = useAppStore((s) => s.pendingRenameNodeId)
  const pendingRenameTarget = useAppStore((s) => s.pendingRenameTarget)
  const nodes = useAppStore((s) => s.nodes)

  useEffect(() => {
    if (pendingRenameTarget !== 'container' || !pendingRenameNodeId) return
    const node = useAppStore.getState().consumePendingRename('container', (n) =>
      items.some((item) => item.id === n.id)
    )
    if (node) {
      setRenamingId(node.id)
      setRenameValue(node.title)
    }
  }, [pendingRenameNodeId, pendingRenameTarget, items])

  const startRename = (node: TreeNode): void => {
    setRenamingId(node.id)
    setRenameValue(node.title)
  }

  const handleRenameCommit = async (id: string): Promise<void> => {
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenamingId(null)
      return
    }
    const node = nodes.find((n) => n.id === id)
    if (!node || trimmed === node.title) {
      setRenamingId(null)
      return
    }
    await useHistoryStore.getState().push(
      makeRenameCommand({ id, oldTitle: node.title, newTitle: trimmed })
    )
    setRenamingId(null)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    if (!onReorder) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((n) => n.id === active.id)
    const newIndex = items.findIndex((n) => n.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  const content = (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((n) => n.id)} strategy={rectSortingStrategy}>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((node) => (
                <SortableCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  readOnly={readOnly}
                  menuVariant={menuVariant}
                  renaming={renamingId === node.id}
                  renameValue={renameValue}
                  onRenameValueChange={setRenameValue}
                  onRenameCommit={() => void handleRenameCommit(node.id)}
                  onRenameCancel={() => setRenamingId(null)}
                  onSelect={() => onSelect(node)}
                  onRename={
                    onRename
                      ? () => onRename(node)
                      : () => startRename(node)
                  }
                  onMoveTo={onMoveTo ? () => onMoveTo(node) : undefined}
                  onOpenNewWindow={onOpenNewWindow ? () => onOpenNewWindow(node) : undefined}
                  onMoveToTrash={onMoveToTrash ? () => onMoveToTrash(node) : undefined}
                  onRecover={onRecover ? () => onRecover(node) : undefined}
                  onPermanentDelete={onPermanentDelete ? () => onPermanentDelete(node) : undefined}
                  onConfirm={setConfirm}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )

  return (
    <div className="no-drag flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-8 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="shrink-0 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {emptyMenuItems && emptyMenuItems.length > 0 ? (
        <EmptyAreaContextMenu items={emptyMenuItems}>{content}</EmptyAreaContextMenu>
      ) : (
        content
      )}
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          destructive={confirm.destructive}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
