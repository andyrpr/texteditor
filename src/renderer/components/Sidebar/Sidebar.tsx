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
  Trash2
} from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/UI/tooltip'
import { Button } from '@/components/UI/button'
import { ChapterStructureModal } from '@/components/Project/ChapterStructureModal'
import { SidebarTree } from '@/components/Sidebar/SidebarTree'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/UI/dialog'
import { useAppStore } from '@/store/appStore'
import { useResizeHandle, usePersistLayout } from '@/hooks/useResize'
import { publishNavigationSyncAsync } from '@/lib/navigationSync'
import { cn } from '@/lib/utils'
import {
  getTrashCategories,
  hasTrashItems,
  isWikiEntityType,
  trashContainerId
} from '@/lib/treeUtils'
import type { ChapterStructure, FolderScope, NodeType, TrashCategory } from '@shared/types'
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, TRASH_CATEGORY_LABELS } from '@shared/types'

const SECTION_MAP = {
  manuscript: { id: 'manuscript', label: 'Manuscript', icon: BookOpen, scope: 'manuscript' as FolderScope },
  characters: { id: 'characters', label: 'Characters', icon: Users, scope: 'characters' as FolderScope, nodeType: 'character' as NodeType },
  locations: { id: 'locations', label: 'Locations', icon: MapPin, scope: 'locations' as FolderScope, nodeType: 'location' as NodeType },
  lore: { id: 'lore', label: 'Lore', icon: Scroll, scope: 'lore' as FolderScope, nodeType: 'lore' as NodeType },
  notes: { id: 'notes', label: 'Notes', icon: StickyNote, scope: 'notes' as FolderScope, nodeType: 'note' as NodeType }
}

const SIDEBAR_TITLEBAR_INSET = 78
const SIDEBAR_ICON_ONLY_THRESHOLD = SIDEBAR_MIN_WIDTH + 16

function SortableSection({
  id,
  children,
  iconOnly
}: {
  id: string
  children: React.ReactNode
  iconOnly: boolean
}): React.JSX.Element {
  if (iconOnly) return <div>{children}</div>

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-35')}
    >
      <div className="group/section flex items-start">
        <button className="mt-1.5 shrink-0 p-0.5 opacity-0 group-hover/section:opacity-100 cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
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
  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onSelectContainer}
            className={cn(
              'mx-auto mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              isContainerSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
            aria-label={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className={cn('mx-1 flex min-w-0 items-center gap-1 rounded-md px-2 py-1.5', isContainerSelected && 'bg-accent text-accent-foreground')}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onToggle() }} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground">
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      <button
        type="button"
        onClick={onSelectContainer}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-semibold',
          isContainerSelected ? 'text-accent-foreground' : 'text-foreground hover:text-foreground'
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {onAdd && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdd() }}
          className={cn('shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground', addOnHover && 'opacity-0 transition-opacity group-hover/section:opacity-100')}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

interface SidebarProps {
  detached?: boolean
}

export function Sidebar({ detached = false }: SidebarProps): React.JSX.Element {
  const {
    nodes,
    selectedContainerId,
    expandedSections,
    sectionOrder,
    sidebarWidth,
    projectMeta,
    selectContainer,
    selectWikiEntity,
    setSelectedNodeId,
    toggleSection,
    setNodes,
    addNode,
    setSectionOrder,
    setSidebarWidth,
    setSidebarDetached,
    setEntityDetached
  } = useAppStore()

  const [showChapterModal, setShowChapterModal] = useState(false)
  const [chapterParentId, setChapterParentId] = useState<string | null>(null)
  const [showTrashEmpty, setShowTrashEmpty] = useState(false)

  const iconOnly = !detached && sidebarWidth <= SIDEBAR_ICON_ONLY_THRESHOLD
  const showSidebarDetach = sidebarWidth >= SIDEBAR_MAX_WIDTH * 0.5
  const width = detached ? '100%' : sidebarWidth
  const trashCategories = getTrashCategories(nodes)

  const { handleProps } = useResizeHandle(sidebarWidth, setSidebarWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
  usePersistLayout(sidebarWidth, 'sidebarWidth')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const orderedSections = useMemo(() => {
    const manuscript = SECTION_MAP.manuscript
    const rest = sectionOrder.map((id) => SECTION_MAP[id as keyof typeof SECTION_MAP]).filter(Boolean)
    return [manuscript, ...rest]
  }, [sectionOrder])

  const handleAddScene = async (chapterId: string): Promise<void> => {
    const node = await window.electronAPI.tree.create(chapterId, 'scene', 'New Scene')
    addNode(node)
    setSelectedNodeId(node.id)
  }

  const handleAddEntity = async (type: NodeType, parentId: string | null = null): Promise<void> => {
    const defaults: Record<NodeType, string> = {
      folder: 'New Folder',
      chapter: 'New Chapter',
      scene: 'New Scene',
      character: 'New Character',
      location: 'New Location',
      lore: 'New Lore Entry',
      note: 'New Note'
    }
    const node = await window.electronAPI.tree.create(parentId, type, defaults[type])
    addNode(node)
    if (isWikiEntityType(node.type)) selectWikiEntity(node.id, node.type)
  }

  const handleAddChapterClick = (): void => {
    setChapterParentId(null)
    setShowChapterModal(true)
  }

  const handleChapterStructure = async (structure: ChapterStructure): Promise<void> => {
    setShowChapterModal(false)
    const node = await window.electronAPI.tomes.createChapter(structure, chapterParentId)
    const all = await window.electronAPI.tree.getAll()
    setNodes(all)
    if (structure === 'scenes') {
      const scene = all.find((n) => n.parentId === node.id && n.type === 'scene')
      setSelectedNodeId(scene?.id ?? node.id)
    } else {
      setSelectedNodeId(node.id)
    }
  }

  const openInNewWindow = (node: import('@shared/types').TreeNode): void => {
    if (node.type === 'note') {
      selectWikiEntity(node.id, node.type)
      void publishNavigationSyncAsync()
        .then(() => window.electronAPI.windows.detach('entity'))
        .then(() => setEntityDetached(true))
      return
    }
    void window.electronAPI.windows.openDocument(node.id, node.title)
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
    void publishNavigationSyncAsync()
      .then(() => window.electronAPI.windows.detach('sidebar'))
      .then(() => setSidebarDetached(true))
  }

  const handleTrashHeaderClick = (): void => {
    if (!hasTrashItems(nodes)) {
      setShowTrashEmpty(true)
      return
    }
    toggleSection('trash')
  }

  const renderTrashCategory = (category: TrashCategory): React.JSX.Element => {
    const containerId = trashContainerId(category)
    return (
      <button
        key={category}
        type="button"
        onClick={() => selectContainer(containerId)}
        className={cn(
          'mx-2 mb-0.5 flex w-[calc(100%-16px)] cursor-pointer items-center rounded-md py-1 pl-6 text-xs',
          selectedContainerId === containerId
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        {TRASH_CATEGORY_LABELS[category]}
      </button>
    )
  }

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <aside className="relative flex h-full shrink-0 flex-col overflow-hidden bg-sidebar transition-[width] duration-150" style={{ width }}>
          {!detached && (
            <div className="drag-region flex h-9 shrink-0 items-center justify-end border-b border-sidebar-border px-2" style={{ paddingLeft: SIDEBAR_TITLEBAR_INSET }}>
              {showSidebarDetach && (
                <Button variant="ghost" size="icon" className="no-drag h-7 w-7" title="Detach sidebar" onClick={handleDetach}>
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <div className={cn('relative flex min-h-0 flex-1 flex-col', !detached && 'border-r border-sidebar-border')}>
            <div className={cn('flex-1 overflow-x-hidden overflow-y-auto', iconOnly ? 'py-1' : 'py-2')}>
              {!detached && !iconOnly && projectMeta && (
                <div className="mb-1 min-w-0 px-2">
                  <p className="truncate text-sm font-semibold leading-tight">{projectMeta.title}</p>
                  {projectMeta.author && <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{projectMeta.author}</p>}
                </div>
              )}

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
                  <SidebarTree
                    scope="manuscript"
                    parentId={null}
                    disabled={showChapterModal}
                    onAddScene={handleAddScene}
                    onOpenNewWindow={openInNewWindow}
                  />
                )}
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCorners} modifiers={[restrictToVerticalAxis]} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  {orderedSections.slice(1).map((section) => (
                    <SortableSection key={section.id} id={section.id} iconOnly={iconOnly}>
                      <SectionHeader
                        label={section.label}
                        icon={section.icon}
                        isExpanded={expandedSections.has(section.id)}
                        iconOnly={iconOnly}
                        isContainerSelected={selectedContainerId === section.id}
                        onToggle={() => toggleSection(section.id)}
                        onSelectContainer={() => {
                          if (!expandedSections.has(section.id)) toggleSection(section.id)
                          selectContainer(section.id)
                        }}
                        onAdd={() => void handleAddEntity(section.nodeType!)}
                        addOnHover
                      />
                      {expandedSections.has(section.id) && !iconOnly && section.scope && (
                        <SidebarTree
                          scope={section.scope}
                          parentId={null}
                          onAddEntity={() => void handleAddEntity(section.nodeType!)}
                          onOpenNewWindow={openInNewWindow}
                        />
                      )}
                    </SortableSection>
                  ))}
                </SortableContext>
              </DndContext>

              <div className="mt-1">
                <SectionHeader
                  label="Trash"
                  icon={Trash2}
                  isExpanded={expandedSections.has('trash')}
                  iconOnly={iconOnly}
                  isContainerSelected={selectedContainerId === 'trash'}
                  onToggle={handleTrashHeaderClick}
                  onSelectContainer={handleTrashHeaderClick}
                />
                {expandedSections.has('trash') && !iconOnly && trashCategories.map(renderTrashCategory)}
              </div>
            </div>

            {!detached && <div {...handleProps} className={cn(handleProps.className, 'right-0')} style={{ right: 0 }} />}
          </div>
        </aside>
      </TooltipProvider>

      {showChapterModal && (
        <ChapterStructureModal open={showChapterModal} onOpenChange={setShowChapterModal} onSelect={(s) => void handleChapterStructure(s)} />
      )}

      <Dialog open={showTrashEmpty} onOpenChange={setShowTrashEmpty}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nothing here</DialogTitle>
            <DialogDescription>Trash is empty. Deleted items will appear here for up to 50 days.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
