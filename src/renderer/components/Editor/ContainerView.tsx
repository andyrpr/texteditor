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
import { GripVertical } from 'lucide-react'
import { cn, countWords } from '@/lib/utils'
import { stripHtmlPreview } from '@/lib/treeUtils'
import type { TreeNode } from '@shared/types'

interface ContainerViewProps {
  title: string
  subtitle?: string
  items: TreeNode[]
  emptyMessage: string
  selectedNodeId: string | null
  onSelect: (node: TreeNode) => void
  onReorder: (items: TreeNode[]) => void
}

function SortableCard({
  node,
  isSelected,
  onSelect
}: {
  node: TreeNode
  isSelected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const words = countWords(node.content)
  const preview = stripHtmlPreview(node.content)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'no-drag group relative flex flex-col rounded-lg border bg-card p-4 shadow-sm transition-colors cursor-pointer',
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50 hover:bg-accent/30',
        isDragging && 'opacity-50 z-10'
      )}
      onClick={onSelect}
    >
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
      <h3 className="pr-8 font-medium leading-snug">{node.title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">{preview}</p>
      {words > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {words.toLocaleString()} {words === 1 ? 'word' : 'words'}
        </p>
      )}
    </div>
  )
}

export function ContainerView({
  title,
  subtitle,
  items,
  emptyMessage,
  selectedNodeId,
  onSelect,
  onReorder
}: ContainerViewProps): React.JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((n) => n.id === active.id)
    const newIndex = items.findIndex((n) => n.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <div className="no-drag flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-8 py-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
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
                    onSelect={() => onSelect(node)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
