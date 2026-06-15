import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  MapPin,
  Scroll,
  StickyNote,
  Plus,
  GripVertical,
  PanelLeftOpen,
  ExternalLink
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
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/UI/tooltip'
import { Button } from '@/components/UI/button'
import { ChapterStructureModal } from '@/components/Project/ChapterStructureModal'
import { useAppStore, getChapters, getScenes, getNodesByType } from '@/store/appStore'
import { useResizeHandle, usePersistLayout } from '@/hooks/useResize'
import { cn } from '@/lib/utils'
import { isChapterFolder } from '@/lib/treeUtils'
import type { ChapterStructure, NodeType, TreeNode } from '@shared/types'
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH
} from '@shared/types'

const SECTION_MAP = {
  manuscript: { id: 'manuscript', label: 'Manuscript', icon: BookOpen },
  characters: { id: 'characters', label: 'Characters', icon: Users, nodeType: 'character' as NodeType },
  locations: { id: 'locations', label: 'Locations', icon: MapPin, nodeType: 'location' as NodeType },
  lore: { id: 'lore', label: 'Lore', icon: Scroll, nodeType: 'lore' as NodeType },
  notes: { id: 'notes', label: 'Notes', icon: StickyNote, nodeType: 'note' as NodeType }
}

function SortableSection({
  id,
  children
}: {
  id: string
  children: React.ReactNode
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-60')}
    >
      <div className="group/section flex items-start">
        <button
          className="mt-1.5 opacity-0 group-hover/section:opacity-100 p-0.5 cursor-grab touch-none shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function TreeContextMenu({
  node,
  onRename,
  onDelete,
  onOpenNewWindow,
  children
}: {
  node: TreeNode
  onRename: () => void
  onDelete: () => void
  onOpenNewWindow: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <ContextMenu.Item
            className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onSelect={onOpenNewWindow}
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open in New Window
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
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

function HoverAddButton({
  onClick,
  className
}: {
  onClick: () => void
  className?: string
}): React.JSX.Element {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground',
        className
      )}
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  )
}

function SortableTreeItem({
  node,
  depth = 0,
  isSelected,
  iconOnly,
  onSelect,
  onRename,
  onDelete,
  onOpenNewWindow,
  onDoubleClick,
  trailingAction
}: {
  node: TreeNode
  depth?: number
  isSelected: boolean
  iconOnly: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
  onOpenNewWindow: () => void
  onDoubleClick: () => void
  trailingAction?: React.ReactNode
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: iconOnly ? '4px' : `${depth * 12 + 8}px`
  }

  return (
    <TreeContextMenu node={node} onRename={onRename} onDelete={onDelete} onOpenNewWindow={onOpenNewWindow}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group flex items-center gap-1 rounded-md py-1 pr-2 text-sm cursor-pointer select-none',
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
          isDragging && 'opacity-50'
        )}
        onClick={onSelect}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onDoubleClick()
        }}
      >
        {!iconOnly && (
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 cursor-grab touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        <span className={cn('truncate flex-1', iconOnly && 'sr-only')}>{node.title}</span>
        {trailingAction}
      </div>
    </TreeContextMenu>
  )
}

function SectionHeader({
  label,
  icon: Icon,
  isExpanded,
  iconOnly,
  isContainerSelected,
  onToggle,
  onSelectContainer,
  onAdd,
  addOnHover = false
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  isExpanded: boolean
  iconOnly: boolean
  isContainerSelected?: boolean
  onToggle: () => void
  onSelectContainer?: () => void
  onAdd?: () => void
  addOnHover?: boolean
}): React.JSX.Element {
  const content = (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1.5 rounded-md mx-1',
        isContainerSelected && 'bg-accent text-accent-foreground'
      )}
    >
      {!iconOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      )}
      <button
        type="button"
        onClick={onSelectContainer}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-left',
          isContainerSelected ? 'text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
          iconOnly && 'justify-center'
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {!iconOnly && <span className="truncate">{label}</span>}
      </button>
      {onAdd && !iconOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          className={cn(
            'shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground',
            addOnHover && 'opacity-0 transition-opacity group-hover/section:opacity-100'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }
  return content
}

interface SidebarProps {
  detached?: boolean
}

export function Sidebar({ detached = false }: SidebarProps): React.JSX.Element {
  const {
    nodes,
    selectedNodeId,
    selectedContainerId,
    expandedSections,
    sectionOrder,
    sidebarWidth,
    projectMeta,
    setSelectedNodeId,
    selectContainer,
    toggleSection,
    setNodes,
    removeNode,
    addNode,
    updateNodeInStore,
    setSectionOrder,
    setSidebarWidth,
    setSidebarDetached
  } = useAppStore()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showChapterModal, setShowChapterModal] = useState(false)

  const iconOnly = sidebarWidth <= SIDEBAR_MIN_WIDTH + 16
  const width = detached ? '100%' : sidebarWidth

  const { handleProps } = useResizeHandle(
    sidebarWidth,
    setSidebarWidth,
    SIDEBAR_MIN_WIDTH,
    SIDEBAR_MAX_WIDTH
  )
  usePersistLayout(sidebarWidth, 'sidebarWidth')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const orderedSections = useMemo(() => {
    const manuscript = SECTION_MAP.manuscript
    const rest = sectionOrder
      .map((id) => SECTION_MAP[id as keyof typeof SECTION_MAP])
      .filter(Boolean)
    return [manuscript, ...rest]
  }, [sectionOrder])

  const handleAddScene = async (chapterId: string): Promise<void> => {
    const node = await window.electronAPI.tree.create(chapterId, 'scene', 'New Scene')
    addNode(node)
    setSelectedNodeId(node.id)
    startRename(node)
  }

  const handleAddEntity = async (type: NodeType): Promise<void> => {
    const defaults: Record<NodeType, string> = {
      chapter: 'New Chapter',
      scene: 'New Scene',
      character: 'New Character',
      location: 'New Location',
      lore: 'New Lore Entry',
      note: 'New Note'
    }
    const node = await window.electronAPI.tree.create(null, type, defaults[type])
    addNode(node)
    setSelectedNodeId(node.id)
    startRename(node)
  }

  const handleAddChapterClick = async (): Promise<void> => {
    const config = await window.electronAPI.tomes.getConfig()
    if (config.preferences.skipChapterStructurePrompt && config.preferences.defaultChapterStructure) {
      const node = await window.electronAPI.tomes.createChapter(config.preferences.defaultChapterStructure)
      addNode(node)
      const scenes = nodes.filter((n) => n.parentId === node.id)
      if (scenes.length) setSelectedNodeId(scenes[0].id)
      else setSelectedNodeId(node.id)
      const all = await window.electronAPI.tree.getAll()
      setNodes(all)
      return
    }
    setShowChapterModal(true)
  }

  const handleChapterStructure = async (structure: ChapterStructure): Promise<void> => {
    setShowChapterModal(false)
    const node = await window.electronAPI.tomes.createChapter(structure)
    const all = await window.electronAPI.tree.getAll()
    setNodes(all)
    if (structure === 'scenes') {
      const scene = all.find((n) => n.parentId === node.id && n.type === 'scene')
      setSelectedNodeId(scene?.id ?? node.id)
    } else {
      setSelectedNodeId(node.id)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.electronAPI.tree.delete(id)
    removeNode(id)
  }

  const handleRename = async (id: string): Promise<void> => {
    if (!renameValue.trim()) {
      setRenamingId(null)
      return
    }
    const updated = await window.electronAPI.tree.update(id, { title: renameValue.trim() })
    updateNodeInStore(id, { title: updated.title })
    setRenamingId(null)
  }

  const startRename = (node: TreeNode): void => {
    setRenamingId(node.id)
    setRenameValue(node.title)
  }

  const openInNewWindow = (node: TreeNode): void => {
    void window.electronAPI.windows.openDocument(node.id, node.title)
  }

  const handleNodeDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeNode = nodes.find((n) => n.id === active.id)
    const overNode = nodes.find((n) => n.id === over.id)
    if (!activeNode || !overNode || activeNode.parentId !== overNode.parentId) return

    const siblings = nodes
      .filter((n) => n.parentId === activeNode.parentId && n.type === activeNode.type)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const oldIndex = siblings.findIndex((n) => n.id === active.id)
    const newIndex = siblings.findIndex((n) => n.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(siblings, oldIndex, newIndex)
    const items = reordered.map((n, i) => ({ id: n.id, parentId: n.parentId, sortOrder: i }))
    const updated = await window.electronAPI.tree.reorder(items)
    setNodes(updated)
  }

  const handleSectionDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sectionOrder.indexOf(String(active.id))
    const newIndex = sectionOrder.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(sectionOrder, oldIndex, newIndex)
    setSectionOrder(next)
    await window.electronAPI.tomes.updateUiState({ sectionOrder: next })
  }

  const handleDetach = (): void => {
    void window.electronAPI.windows.detach('sidebar').then(() => setSidebarDetached(true))
  }

  const chapters = getChapters(nodes)

  const renderRenameInput = (id: string): React.JSX.Element => (
    <input
      autoFocus
      value={renameValue}
      onChange={(e) => setRenameValue(e.target.value)}
      onBlur={() => handleRename(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') void handleRename(id)
        if (e.key === 'Escape') setRenamingId(null)
      }}
      className="mx-2 mb-1 w-[calc(100%-16px)] rounded border border-input bg-background px-2 py-1 text-sm"
    />
  )

  return (
    <>
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-150',
          iconOnly && 'sidebar-icon-only'
        )}
        style={{ width }}
      >
        {!detached && (
          <div
            className="flex h-9 items-center justify-end border-b border-sidebar-border px-2 drag-region"
            style={{ paddingLeft: '78px' }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="no-drag h-7 w-7"
              title="Detach sidebar"
              onClick={handleDetach}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {!iconOnly && !detached && projectMeta && (
            <div className="mb-1 px-2">
              <p className="truncate text-sm font-semibold leading-tight">{projectMeta.title}</p>
              {projectMeta.author && (
                <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">
                  {projectMeta.author}
                </p>
              )}
            </div>
          )}
          {/* Manuscript — fixed first */}
          <div>
            <SectionHeader
              label="Manuscript"
              icon={BookOpen}
              isExpanded={expandedSections.has('manuscript')}
              iconOnly={iconOnly}
              isContainerSelected={selectedContainerId === 'manuscript'}
              onToggle={() => toggleSection('manuscript')}
              onSelectContainer={() => {
                if (!expandedSections.has('manuscript')) toggleSection('manuscript')
                selectContainer('manuscript')
              }}
              onAdd={handleAddChapterClick}
            />
            {expandedSections.has('manuscript') && !iconOnly && (
              <DndContext
                sensors={showChapterModal ? [] : sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleNodeDragEnd}
              >
                {chapters.map((chapter) => {
                  const scenes = getScenes(nodes, chapter.id)
                  const showScenes = isChapterFolder(chapter)
                  const sortIds = showScenes ? [chapter.id, ...scenes.map((s) => s.id)] : [chapter.id]

                  return (
                    <div key={chapter.id} className="group/chapter">
                      {renamingId === chapter.id ? (
                        renderRenameInput(chapter.id)
                      ) : (
                        <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
                          <SortableTreeItem
                            node={chapter}
                            isSelected={selectedNodeId === chapter.id}
                            iconOnly={iconOnly}
                            onSelect={() => setSelectedNodeId(chapter.id)}
                            onRename={() => startRename(chapter)}
                            onDelete={() => handleDelete(chapter.id)}
                            onOpenNewWindow={() => openInNewWindow(chapter)}
                            onDoubleClick={() => startRename(chapter)}
                            trailingAction={
                              showScenes && scenes.length === 0 ? (
                                <HoverAddButton
                                  className="group-hover/chapter:opacity-100"
                                  onClick={() => void handleAddScene(chapter.id)}
                                />
                              ) : undefined
                            }
                          />
                          {showScenes &&
                            scenes.map((scene, sceneIndex) =>
                              renamingId === scene.id ? (
                                <div key={scene.id}>{renderRenameInput(scene.id)}</div>
                              ) : (
                                <SortableTreeItem
                                  key={scene.id}
                                  node={scene}
                                  depth={1}
                                  isSelected={selectedNodeId === scene.id}
                                  iconOnly={iconOnly}
                                  onSelect={() => setSelectedNodeId(scene.id)}
                                  onRename={() => startRename(scene)}
                                  onDelete={() => handleDelete(scene.id)}
                                  onOpenNewWindow={() => openInNewWindow(scene)}
                                  onDoubleClick={() => startRename(scene)}
                                  trailingAction={
                                    sceneIndex === scenes.length - 1 ? (
                                      <HoverAddButton
                                        className="group-hover/chapter:opacity-100"
                                        onClick={() => void handleAddScene(chapter.id)}
                                      />
                                    ) : undefined
                                  }
                                />
                              )
                            )}
                        </SortableContext>
                      )}
                    </div>
                  )
                })}
              </DndContext>
            )}
          </div>

          {/* Reorderable wiki sections */}
          <DndContext
            sensors={showChapterModal ? [] : sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {orderedSections.slice(1).map((section) => {
                const isExpanded = expandedSections.has(section.id)
                const Icon = section.icon
                const sectionNodes = section.nodeType ? getNodesByType(nodes, section.nodeType) : []

                return (
                  <SortableSection key={section.id} id={section.id}>
                    <SectionHeader
                      label={section.label}
                      icon={Icon}
                      isExpanded={isExpanded}
                      iconOnly={iconOnly}
                      isContainerSelected={selectedContainerId === section.id}
                      onToggle={() => toggleSection(section.id)}
                      onSelectContainer={() => {
                        if (!isExpanded) toggleSection(section.id)
                        selectContainer(section.id)
                      }}
                      onAdd={
                        section.nodeType && sectionNodes.length === 0
                          ? () => void handleAddEntity(section.nodeType!)
                          : undefined
                      }
                      addOnHover={sectionNodes.length === 0}
                    />
                    {isExpanded &&
                      !iconOnly &&
                      sectionNodes.map((node, nodeIndex) =>
                        renamingId === node.id ? (
                          <div key={node.id}>{renderRenameInput(node.id)}</div>
                        ) : (
                          <TreeContextMenu
                            key={node.id}
                            node={node}
                            onRename={() => startRename(node)}
                            onDelete={() => handleDelete(node.id)}
                            onOpenNewWindow={() => openInNewWindow(node)}
                          >
                            <div
                              className={cn(
                                'group/row mx-2 flex cursor-pointer items-center rounded-md py-1 pl-2 text-sm',
                                selectedNodeId === node.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'hover:bg-accent/50'
                              )}
                              onClick={() => setSelectedNodeId(node.id)}
                              onDoubleClick={() => startRename(node)}
                            >
                              <span className="truncate flex-1">{node.title}</span>
                              {nodeIndex === sectionNodes.length - 1 && section.nodeType && (
                                <HoverAddButton
                                  className="mr-1 group-hover/section:opacity-100"
                                  onClick={() => void handleAddEntity(section.nodeType!)}
                                />
                              )}
                            </div>
                          </TreeContextMenu>
                        )
                      )}
                  </SortableSection>
                )
              })}
            </SortableContext>
          </DndContext>
        </div>

        {!detached && (
          <div
            {...handleProps}
            className={cn(handleProps.className, 'right-0')}
            style={{ right: 0 }}
          />
        )}
      </aside>
    </TooltipProvider>

    {showChapterModal && (
      <ChapterStructureModal
        open={showChapterModal}
        onOpenChange={setShowChapterModal}
        onSelect={(structure) => void handleChapterStructure(structure)}
      />
    )}
    </>
  )
}
