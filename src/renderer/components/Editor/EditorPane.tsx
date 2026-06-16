import { useAppStore, getScenes, getNodesByType } from '@/store/appStore'
import { RichTextEditor } from '@/components/Editor/RichTextEditor'
import { ContainerView } from '@/components/Editor/ContainerView'
import { isChapterFolder, isWikiEntityType } from '@/lib/treeUtils'
import type { ContainerSectionId } from '@/lib/treeUtils'
import type { NodeType, TreeNode } from '@shared/types'

const SECTION_CONTAINER_META: Record<
  ContainerSectionId,
  { title: string; nodeType: NodeType; emptyMessage: string }
> = {
  manuscript: {
    title: 'Manuscript',
    nodeType: 'chapter',
    emptyMessage: 'No chapters yet. Use + in the sidebar to add one.'
  },
  characters: {
    title: 'Characters',
    nodeType: 'character',
    emptyMessage: 'No characters yet. Use + in the sidebar to add one.'
  },
  locations: {
    title: 'Locations',
    nodeType: 'location',
    emptyMessage: 'No locations yet. Use + in the sidebar to add one.'
  },
  lore: {
    title: 'Lore',
    nodeType: 'lore',
    emptyMessage: 'No lore entries yet. Use + in the sidebar to add one.'
  },
  notes: {
    title: 'Notes',
    nodeType: 'note',
    emptyMessage: 'No notes yet. Use + in the sidebar to add one.'
  }
}

function isContainerSectionId(id: string): id is ContainerSectionId {
  return id in SECTION_CONTAINER_META
}

export function EditorPane(): React.JSX.Element {
  const {
    nodes,
    selectedNodeId,
    selectedEntityId,
    selectedContainerId,
    setSelectedNodeId,
    setSelectedEntity,
    setNodes
  } = useAppStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  const persistReorder = async (reordered: TreeNode[], parentId: string | null): Promise<void> => {
    const items = reordered.map((n, i) => ({ id: n.id, parentId, sortOrder: i }))
    const updated = await window.electronAPI.tree.reorder(items)
    setNodes(updated)
  }

  const selectManuscriptChapter = (node: TreeNode): void => {
    if (node.type === 'chapter') {
      setSelectedNodeId(node.id)
    }
  }

  const selectWikiEntity = (node: TreeNode): void => {
    if (isWikiEntityType(node.type)) {
      setSelectedEntity(node.id, node.type)
    }
  }

  if (selectedContainerId && isContainerSectionId(selectedContainerId)) {
    const meta = SECTION_CONTAINER_META[selectedContainerId]
    const items = getNodesByType(nodes, meta.nodeType)
    const isManuscript = selectedContainerId === 'manuscript'

    return (
      <ContainerView
        title={meta.title}
        items={items}
        emptyMessage={meta.emptyMessage}
        selectedNodeId={isManuscript ? selectedNodeId : selectedEntityId}
        onSelect={isManuscript ? selectManuscriptChapter : selectWikiEntity}
        onReorder={(reordered) => void persistReorder(reordered, null)}
      />
    )
  }

  if (selectedNode && isChapterFolder(selectedNode)) {
    const scenes = getScenes(nodes, selectedNode.id)

    return (
      <ContainerView
        title={selectedNode.title}
        subtitle="Scenes in this chapter"
        items={scenes}
        emptyMessage="No scenes yet. Use + on the last scene row in the sidebar to add one."
        selectedNodeId={selectedNodeId}
        onSelect={(node) => setSelectedNodeId(node.id)}
        onReorder={(reordered) => void persistReorder(reordered, selectedNode.id)}
      />
    )
  }

  return <RichTextEditor node={selectedNode} />
}
