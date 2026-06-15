import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  MapPin,
  Scroll,
  StickyNote,
  Plus,
  GripVertical
} from 'lucide-react'
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { useAppStore, getChapters, getScenes, getNodesByType } from '@/store/appStore'
import { cn } from '@/lib/utils'
import type { NodeType, TreeNode } from '@shared/types'

const SECTION_CONFIG = [
  { id: 'manuscript', label: 'Manuscript', icon: BookOpen },
  { id: 'characters', label: 'Characters', icon: Users, nodeType: 'character' as NodeType },
  { id: 'locations', label: 'Locations', icon: MapPin, nodeType: 'location' as NodeType },
  { id: 'lore', label: 'Lore', icon: Scroll, nodeType: 'lore' as NodeType },
  { id: 'notes', label: 'Notes', icon: StickyNote, nodeType: 'note' as NodeType }
]

function SortableTreeItem({
  node,
  depth = 0,
  isSelected,
  onSelect,
  onRename,
  onDelete
}: {
  node: TreeNode
  depth?: number
  isSelected: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${depth * 12 + 8}px`
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            'group flex items-center gap-1 rounded-md py-1 pr-2 text-sm cursor-pointer select-none',
            isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            isDragging && 'opacity-50'
          )}
          onClick={onSelect}
        >
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 cursor-grab touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
          <span className="truncate flex-1">{node.title}</span>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <ContextMenu.Item
            className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onSelect={onRename}
          >
            Rename
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
            onSelect={onDelete}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

function SectionHeader({
  label,
  icon: Icon,
  isExpanded,
  onToggle,
  onAdd
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  isExpanded: boolean
  onToggle: () => void
  onAdd?: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5">
      <button onClick={onToggle} className="flex items-center gap-1 flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function Sidebar(): React.JSX.Element {
  const {
    nodes,
    selectedNodeId,
    expandedSections,
    setSelectedNodeId,
    toggleSection,
    setNodes,
    removeNode,
    addNode,
    updateNodeInStore,
    projectMeta
  } = useAppStore()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAdd = async (type: NodeType, parentId: string | null = null) => {
    const defaults: Record<NodeType, string> = {
      chapter: 'New Chapter',
      scene: 'New Scene',
      character: 'New Character',
      location: 'New Location',
      lore: 'New Lore Entry',
      note: 'New Note'
    }
    const node = await window.electronAPI.tree.create(parentId, type, defaults[type])
    addNode(node)
    setSelectedNodeId(node.id)
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.tree.delete(id)
    removeNode(id)
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null)
      return
    }
    const updated = await window.electronAPI.tree.update(id, { title: renameValue.trim() })
    updateNodeInStore(id, { title: updated.title })
    setRenamingId(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeNode = nodes.find((n) => n.id === active.id)
    const overNode = nodes.find((n) => n.id === over.id)
    if (!activeNode || !overNode) return

    const sameParent = activeNode.parentId === overNode.parentId
    if (!sameParent) return

    const siblings = nodes
      .filter((n) => n.parentId === activeNode.parentId && n.type === activeNode.type)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const oldIndex = siblings.findIndex((n) => n.id === active.id)
    const newIndex = siblings.findIndex((n) => n.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...siblings]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const items = reordered.map((n, i) => ({
      id: n.id,
      parentId: n.parentId,
      sortOrder: i
    }))

    const updated = await window.electronAPI.tree.reorder({ items })
    setNodes(updated)
  }

  const chapters = getChapters(nodes)

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-3">
        <h1 className="truncate text-sm font-semibold text-sidebar-foreground">
          {projectMeta?.title ?? 'Untitled'}
        </h1>
        {projectMeta?.author && (
          <p className="truncate text-xs text-muted-foreground">{projectMeta.author}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {SECTION_CONFIG.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const Icon = section.icon

          if (section.id === 'manuscript') {
            return (
              <div key={section.id}>
                <SectionHeader
                  label={section.label}
                  icon={Icon}
                  isExpanded={isExpanded}
                  onToggle={() => toggleSection(section.id)}
                  onAdd={() => handleAdd('chapter')}
                />
                {isExpanded && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    {chapters.map((chapter) => {
                      const scenes = getScenes(nodes, chapter.id)
                      const chapterSortIds = [chapter.id, ...scenes.map((s) => s.id)]

                      return (
                        <div key={chapter.id}>
                          {renamingId === chapter.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => handleRename(chapter.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(chapter.id)
                                if (e.key === 'Escape') setRenamingId(null)
                              }}
                              className="mx-2 mb-1 w-[calc(100%-16px)] rounded border border-input bg-background px-2 py-1 text-sm"
                            />
                          ) : (
                            <SortableContext items={chapterSortIds} strategy={verticalListSortingStrategy}>
                              <SortableTreeItem
                                node={chapter}
                                isSelected={selectedNodeId === chapter.id}
                                onSelect={() => setSelectedNodeId(chapter.id)}
                                onRename={() => {
                                  setRenamingId(chapter.id)
                                  setRenameValue(chapter.title)
                                }}
                                onDelete={() => handleDelete(chapter.id)}
                              />
                              {scenes.map((scene) => (
                                <SortableTreeItem
                                  key={scene.id}
                                  node={scene}
                                  depth={1}
                                  isSelected={selectedNodeId === scene.id}
                                  onSelect={() => setSelectedNodeId(scene.id)}
                                  onRename={() => {
                                    setRenamingId(scene.id)
                                    setRenameValue(scene.title)
                                  }}
                                  onDelete={() => handleDelete(scene.id)}
                                />
                              ))}
                            </SortableContext>
                          )}
                          <button
                            onClick={() => handleAdd('scene', chapter.id)}
                            className="ml-6 flex items-center gap-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" /> Add scene
                          </button>
                        </div>
                      )
                    })}
                  </DndContext>
                )}
              </div>
            )
          }

          const sectionNodes = section.nodeType ? getNodesByType(nodes, section.nodeType) : []

          return (
            <div key={section.id}>
              <SectionHeader
                label={section.label}
                icon={Icon}
                isExpanded={isExpanded}
                onToggle={() => toggleSection(section.id)}
                onAdd={section.nodeType ? () => handleAdd(section.nodeType!) : undefined}
              />
              {isExpanded &&
                sectionNodes.map((node) =>
                  renamingId === node.id ? (
                    <input
                      key={node.id}
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(node.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(node.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      className="mx-2 mb-1 w-[calc(100%-16px)] rounded border border-input bg-background px-2 py-1 text-sm"
                    />
                  ) : (
                    <div
                      key={node.id}
                      className={cn(
                        'mx-2 flex cursor-pointer items-center rounded-md px-2 py-1 text-sm',
                        selectedNodeId === node.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      )}
                      onClick={() => setSelectedNodeId(node.id)}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <ContextMenu.Root>
                        <ContextMenu.Trigger asChild>
                          <span className="truncate">{node.title}</span>
                        </ContextMenu.Trigger>
                        <ContextMenu.Portal>
                          <ContextMenu.Content className="z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md">
                            <ContextMenu.Item
                              className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                              onSelect={() => {
                                setRenamingId(node.id)
                                setRenameValue(node.title)
                              }}
                            >
                              Rename
                            </ContextMenu.Item>
                            <ContextMenu.Separator className="my-1 h-px bg-border" />
                            <ContextMenu.Item
                              className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                              onSelect={() => handleDelete(node.id)}
                            >
                              Delete
                            </ContextMenu.Item>
                          </ContextMenu.Content>
                        </ContextMenu.Portal>
                      </ContextMenu.Root>
                    </div>
                  )
                )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
