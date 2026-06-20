import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useHistoryStore } from '@/store/historyStore'
import {
  makeCreateChapterCommand,
  makeCreateFolderCommand,
  makeCreateNodeCommand,
  makeMoveToTrashCommand,
  makeReorderCommand,
  makeReparentCommand
} from '@/lib/commands'
import { requestRenameAfterCreate } from '@/lib/pendingRename'
import { RichTextEditor } from '@/components/Editor/RichTextEditor'
import { ContainerView } from '@/components/Editor/ContainerView'
import { MoveSceneDialog } from '@/components/Tree/MoveSceneDialog'
import {
  folderContainerId,
  getCategoryScopedChildren,
  getChildren,
  getScenes,
  getSceneChapters,
  getTrashNodes,
  getFolderScope,
  isChapterFolder,
  isFolder,
  isTrashContainerId,
  isWikiEntityType,
  nodeTypeForWikiSection,
  parseFolderContainerId,
  parseTrashContainerId,
  resolveEntryCategoryIdForFolder,
  resolveLegacySectionContainerId
} from '@/lib/treeUtils'
import type { ContainerSectionId } from '@/lib/treeUtils'
import type { ChapterStructure, FolderScope, NodeType, TreeNode } from '@shared/types'
import { TRASH_CATEGORY_LABELS } from '@shared/types'

const SECTION_CONTAINER_META: Record<
  ContainerSectionId,
  { title: string; scope: FolderScope; emptyMessage: string }
> = {
  manuscript: {
    title: 'Manuscript',
    scope: 'manuscript',
    emptyMessage: 'No items yet. Right-click to add a folder or chapter.'
  },
  characters: {
    title: 'Characters',
    scope: 'characters',
    emptyMessage: 'No characters yet. Right-click to add a folder or character.'
  },
  locations: {
    title: 'Locations',
    scope: 'locations',
    emptyMessage: 'No locations yet. Right-click to add a folder or location.'
  },
  lore: {
    title: 'Lore',
    scope: 'lore',
    emptyMessage: 'No lore entries yet. Right-click to add a folder or lore entry.'
  },
  notes: {
    title: 'Notes',
    scope: 'notes',
    emptyMessage: 'No notes yet. Right-click to add a folder or note.'
  }
}

function isContainerSectionId(id: string): id is ContainerSectionId {
  return id in SECTION_CONTAINER_META
}

function containerSelectionId(
  selectedNodeId: string | null,
  selectedEntityId: string | null,
  selectedEntryId: string | null
): string | null {
  return selectedEntryId ?? selectedEntityId ?? selectedNodeId
}

export function EditorPane(): React.JSX.Element {
  const {
    nodes,
    categories,
    selectedNodeId,
    selectedEntityId,
    selectedEntryId,
    selectedContainerId,
    setSelectedNodeId,
    selectWikiEntity,
    setSelectedEntity,
    selectEntry,
    selectContainer,
    setNodes
  } = useAppStore()

  const [moveSceneNode, setMoveSceneNode] = useState<TreeNode | null>(null)
  const [recoverSceneNode, setRecoverSceneNode] = useState<TreeNode | null>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId && !n.deletedAt) ?? null

  const persistReorder = async (reordered: TreeNode[], parentId: string | null): Promise<void> => {
    const nodesBefore = [...useAppStore.getState().nodes]
    const items = reordered.map((n, i) => ({ id: n.id, parentId, sortOrder: i }))
    await useHistoryStore.getState().push(makeReorderCommand({ previousNodes: nodesBefore, newItems: items }))
  }

  const handleMoveToTrash = async (node: TreeNode): Promise<void> => {
    await useHistoryStore.getState().push(makeMoveToTrashCommand({ node }))
  }

  const handleRecover = async (node: TreeNode): Promise<void> => {
    try {
      const updated = await window.electronAPI.tree.restore(node.id)
      setNodes(updated)
    } catch {
      if (node.type === 'scene') {
        const chapters = getSceneChapters(nodes)
        if (chapters.length === 0) {
          const chapter = await window.electronAPI.tomes.createChapter('scenes')
          const restored = await window.electronAPI.tree.restore(node.id, chapter.id)
          setNodes(restored)
        } else {
          setRecoverSceneNode(node)
        }
      }
    }
  }

  const handlePermanentDelete = async (node: TreeNode): Promise<void> => {
    const updated = await window.electronAPI.tree.permanentDelete(node.id)
    setNodes(updated)
  }

  const openInNewWindow = (node: TreeNode): void => {
    if (node.type === 'note') {
      selectWikiEntity(node.id, node.type)
      void window.electronAPI.windows.openDocument(node.id, node.title)
      return
    }
    void window.electronAPI.windows.openDocument(node.id, node.title)
  }

  const createFolder = async (
    scope: FolderScope,
    parentId: string | null,
    entryCategoryId?: string
  ): Promise<void> => {
    const createdId = await useHistoryStore.getState().push(
      makeCreateFolderCommand({ scope, parentId, title: 'New Folder' })
    )
    if (parentId) {
      selectContainer(folderContainerId(parentId))
    } else if (scope === 'manuscript') {
      selectContainer('manuscript')
    } else if (entryCategoryId) {
      selectContainer(entryCategoryId)
    } else {
      selectContainer(scope)
    }
    if (createdId) {
      requestRenameAfterCreate(createdId, 'container')
    }
  }

  const createEntity = async (type: NodeType, parentId: string | null): Promise<void> => {
    const defaults: Record<string, string> = {
      character: 'New Character',
      location: 'New Location',
      lore: 'New Lore Entry',
      note: 'New Note'
    }
    const title = defaults[type] ?? 'New Item'
    const createdId = await useHistoryStore.getState().push(
      makeCreateNodeCommand({ parentId, type, title })
    )
    if (createdId && isWikiEntityType(type)) {
      setSelectedEntity(createdId, type)
    }
    if (createdId) {
      requestRenameAfterCreate(createdId, 'container')
    }
  }

  const createEntry = async (categoryId: string, parentId: string | null): Promise<void> => {
    const category = categories.find((c) => c.id === categoryId)
    const title = category ? `New ${category.name.replace(/s$/, '')}` : 'New Entry'
    const createdId = await useHistoryStore.getState().push(
      makeCreateNodeCommand({ parentId, type: 'entry', title, categoryId })
    )
    if (createdId) {
      if (category?.mode === 'panel') {
        selectEntry(createdId, categoryId)
      } else {
        setSelectedNodeId(createdId)
      }
      requestRenameAfterCreate(createdId, 'container')
    }
  }

  const createChapter = async (structure: ChapterStructure, parentId: string | null): Promise<void> => {
    const chapterId = await useHistoryStore.getState().push(
      makeCreateChapterCommand({ structure, parentId })
    )
    if (!chapterId) return
    const all = useAppStore.getState().nodes
    if (structure === 'scenes') {
      const scene = all.find((n) => n.parentId === chapterId && n.type === 'scene')
      setSelectedNodeId(scene?.id ?? chapterId)
    } else {
      setSelectedNodeId(chapterId)
    }
    requestRenameAfterCreate(chapterId, 'container')
  }

  const createScene = async (chapterId: string): Promise<void> => {
    const createdId = await useHistoryStore.getState().push(
      makeCreateNodeCommand({ parentId: chapterId, type: 'scene', title: 'New Scene' })
    )
    if (createdId) {
      setSelectedNodeId(createdId)
      requestRenameAfterCreate(createdId, 'container')
    }
  }

  const handleMoveScene = async (chapterId: string): Promise<void> => {
    if (!moveSceneNode) return
    await useHistoryStore.getState().push(
      makeReparentCommand({
        nodeId: moveSceneNode.id,
        oldParentId: moveSceneNode.parentId ?? null,
        newParentId: chapterId
      })
    )
    setMoveSceneNode(null)
  }

  const handleRecoverScene = async (chapterId: string): Promise<void> => {
    if (!recoverSceneNode) return
    const updated = await window.electronAPI.tree.restore(recoverSceneNode.id, chapterId)
    setNodes(updated)
    setRecoverSceneNode(null)
  }

  const handleSelectContainerItem = (
    node: TreeNode,
    scope: FolderScope,
    entryCategoryId?: string
  ): void => {
    if (isFolder(node)) {
      selectContainer(folderContainerId(node.id))
      return
    }
    if (scope === 'manuscript' && node.type === 'chapter') {
      setSelectedNodeId(node.id)
      return
    }
    if (node.type === 'entry' && entryCategoryId) {
      const category = categories.find((c) => c.id === entryCategoryId)
      if (category?.mode === 'panel') {
        selectEntry(node.id, entryCategoryId)
      } else {
        setSelectedNodeId(node.id)
      }
      return
    }
    if (isWikiEntityType(node.type)) {
      setSelectedEntity(node.id, node.type)
    }
  }

  const buildEmptyMenu = (
    scope: FolderScope,
    parentId: string | null,
    entryCategoryId?: string
  ) => {
    const items: { label: string; onSelect: () => void }[] = [
      {
        label: 'New Folder',
        onSelect: () => void createFolder(scope, parentId, entryCategoryId)
      }
    ]
    if (scope === 'manuscript') {
      items.push(
        { label: 'New Chapter', onSelect: () => void createChapter('simple', parentId) },
        { label: 'New Chapter with Scenes', onSelect: () => void createChapter('scenes', parentId) }
      )
    } else if (scope === 'entry' && entryCategoryId) {
      const category = categories.find((c) => c.id === entryCategoryId)
      const label = category ? `New ${category.name.replace(/s$/, '')}` : 'New Entry'
      items.push({ label, onSelect: () => void createEntry(entryCategoryId, parentId) })
    } else {
      const type = nodeTypeForWikiSection(scope as ContainerSectionId)
      if (type) {
        const labels: Record<string, string> = {
          character: 'New Character',
          location: 'New Location',
          lore: 'New Lore Entry',
          note: 'New Note'
        }
        items.push({ label: labels[type], onSelect: () => void createEntity(type, parentId) })
      }
    }
    return items
  }

  const dialogs = (
    <>
      <MoveSceneDialog
        open={moveSceneNode !== null}
        onOpenChange={(open) => !open && setMoveSceneNode(null)}
        chapters={getSceneChapters(nodes)}
        onMove={handleMoveScene}
      />
      <MoveSceneDialog
        open={recoverSceneNode !== null}
        onOpenChange={(open) => !open && setRecoverSceneNode(null)}
        chapters={getSceneChapters(nodes)}
        onMove={handleRecoverScene}
      />
    </>
  )

  if (selectedContainerId && isTrashContainerId(selectedContainerId)) {
    const category = parseTrashContainerId(selectedContainerId)!
    const items = getTrashNodes(nodes, category)
    return (
      <>
        <ContainerView
          title={`Trash — ${TRASH_CATEGORY_LABELS[category]}`}
          items={items}
          emptyMessage="Nothing in this category."
          selectedNodeId={selectedNodeId ?? selectedEntityId}
          readOnly
          menuVariant="trash"
          onSelect={(node) => {
            if (isWikiEntityType(node.type)) setSelectedEntity(node.id, node.type)
            else setSelectedNodeId(node.id)
          }}
          onRecover={(node) => void handleRecover(node)}
          onPermanentDelete={(node) => void handlePermanentDelete(node)}
        />
        {dialogs}
      </>
    )
  }

  const sectionContainerId = selectedContainerId
    ? resolveLegacySectionContainerId(selectedContainerId)
    : null

  if (sectionContainerId) {
    const meta = SECTION_CONTAINER_META[sectionContainerId]
    const items = getChildren(nodes, null, meta.scope)
    const isManuscript = sectionContainerId === 'manuscript'

    return (
      <>
        <ContainerView
          title={meta.title}
          items={items}
          emptyMessage={meta.emptyMessage}
          selectedNodeId={
            isManuscript ? selectedNodeId : containerSelectionId(selectedNodeId, selectedEntityId, selectedEntryId)
          }
          onSelect={(node) => handleSelectContainerItem(node, meta.scope)}
          onReorder={(reordered) => void persistReorder(reordered, null)}
          menuVariant={isManuscript ? 'manuscript' : 'wiki'}
          onMoveTo={(node) => setMoveSceneNode(node)}
          onOpenNewWindow={openInNewWindow}
          onMoveToTrash={(node) => void handleMoveToTrash(node)}
          emptyMenuItems={buildEmptyMenu(meta.scope, null)}
        />
        {dialogs}
      </>
    )
  }

  const entryCategory =
    selectedContainerId && !sectionContainerId
      ? (categories.find((c) => c.id === selectedContainerId) ?? null)
      : null

  if (entryCategory) {
    const items = getCategoryScopedChildren(nodes, null, entryCategory.id)
    const emptyLabel = entryCategory.name.replace(/s$/, '')

    return (
      <>
        <ContainerView
          title={entryCategory.name}
          items={items}
          emptyMessage={`No ${emptyLabel.toLowerCase()} entries yet. Right-click to add a folder or entry.`}
          selectedNodeId={containerSelectionId(selectedNodeId, selectedEntityId, selectedEntryId)}
          onSelect={(node) => handleSelectContainerItem(node, 'entry', entryCategory.id)}
          onReorder={(reordered) => void persistReorder(reordered, null)}
          menuVariant="wiki"
          onMoveTo={(node) => setMoveSceneNode(node)}
          onOpenNewWindow={openInNewWindow}
          onMoveToTrash={(node) => void handleMoveToTrash(node)}
          emptyMenuItems={buildEmptyMenu('entry', null, entryCategory.id)}
        />
        {dialogs}
      </>
    )
  }

  const folderId = selectedContainerId ? parseFolderContainerId(selectedContainerId) : null
  if (folderId) {
    const folder = nodes.find((n) => n.id === folderId)
    if (folder && isFolder(folder)) {
      const folderScope = getFolderScope(folder) ?? 'manuscript'
      const entryCategoryId =
        folderScope === 'entry'
          ? resolveEntryCategoryIdForFolder(
              nodes,
              folderId,
              categories.map((c) => c.id)
            )
          : undefined
      const items =
        folderScope === 'entry' && entryCategoryId
          ? getCategoryScopedChildren(nodes, folderId, entryCategoryId)
          : getChildren(nodes, folderId, folderScope)
      return (
        <>
          <ContainerView
            title={folder.title}
            items={items}
            emptyMessage="This folder is empty. Right-click to add items."
            selectedNodeId={
              folderScope === 'manuscript'
                ? selectedNodeId
                : containerSelectionId(selectedNodeId, selectedEntityId, selectedEntryId)
            }
            onSelect={(node) => handleSelectContainerItem(node, folderScope, entryCategoryId)}
            onReorder={(reordered) => void persistReorder(reordered, folderId)}
            menuVariant={folderScope === 'manuscript' ? 'manuscript' : 'wiki'}
            onMoveTo={(node) => setMoveSceneNode(node)}
            onOpenNewWindow={openInNewWindow}
            onMoveToTrash={(node) => void handleMoveToTrash(node)}
            emptyMenuItems={buildEmptyMenu(folderScope, folderId, entryCategoryId)}
          />
          {dialogs}
        </>
      )
    }
  }

  if (selectedNode && isChapterFolder(selectedNode)) {
    const scenes = getScenes(nodes, selectedNode.id)
    return (
      <>
        <ContainerView
          title={selectedNode.title}
          subtitle="Scenes in this chapter"
          items={scenes}
          emptyMessage="No scenes yet. Right-click to add a scene."
          selectedNodeId={selectedNodeId}
          onSelect={(node) => setSelectedNodeId(node.id)}
          onReorder={(reordered) => void persistReorder(reordered, selectedNode.id)}
          menuVariant="manuscript"
          onMoveTo={(node) => setMoveSceneNode(node)}
          onOpenNewWindow={openInNewWindow}
          onMoveToTrash={(node) => void handleMoveToTrash(node)}
          emptyMenuItems={[{ label: 'New Scene', onSelect: () => void createScene(selectedNode.id) }]}
        />
        {dialogs}
      </>
    )
  }

  return (
    <>
      <RichTextEditor node={selectedNode} />
      {dialogs}
    </>
  )
}
