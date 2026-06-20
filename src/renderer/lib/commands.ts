import type { ChapterStructure, FolderScope, NodeType, TreeNode } from '@shared/types'
import { useAppStore } from '@/store/appStore'
import type { StructuralCommand } from '@/store/historyStore'

function syncNodes(nodes: TreeNode[]): void {
  useAppStore.getState().setNodes(nodes)
}

export function makeCreateNodeCommand(params: {
  parentId: string | null
  type: NodeType
  title: string
  scope?: FolderScope
}): StructuralCommand {
  let createdId: string | null = null

  return {
    description: `Create ${params.type} "${params.title}"`,

    getCreatedId: () => createdId,

    execute: async () => {
      try {
        const node = await window.electronAPI.tree.create(
          params.parentId,
          params.type,
          params.title,
          params.scope ? { scope: params.scope } : undefined
        )
        createdId = node.id
        useAppStore.getState().addNode(node)
      } catch (err) {
        console.error('Create node failed:', err)
      }
    },

    undo: async () => {
      if (!createdId) return
      try {
        const updated = await window.electronAPI.tree.permanentDelete(createdId)
        syncNodes(updated)
        const { selectedNodeId, setSelectedNodeId } = useAppStore.getState()
        if (selectedNodeId === createdId) setSelectedNodeId(null)
      } catch (err) {
        console.error('Undo create node failed:', err)
      }
    }
  }
}

export function makeCreateFolderCommand(params: {
  scope: FolderScope
  parentId: string | null
  title: string
}): StructuralCommand {
  let createdId: string | null = null

  return {
    description: `Create folder "${params.title}"`,

    getCreatedId: () => createdId,

    execute: async () => {
      try {
        const node = await window.electronAPI.tree.createFolder(
          params.scope,
          params.parentId,
          params.title
        )
        createdId = node.id
        useAppStore.getState().addNode(node)
      } catch (err) {
        console.error('Create folder failed:', err)
      }
    },

    undo: async () => {
      if (!createdId) return
      try {
        const updated = await window.electronAPI.tree.permanentDelete(createdId)
        syncNodes(updated)
      } catch (err) {
        console.error('Undo create folder failed:', err)
      }
    }
  }
}

export function makeCreateChapterCommand(params: {
  structure: ChapterStructure
  parentId?: string | null
}): StructuralCommand {
  let createdChapterId: string | null = null

  return {
    description: 'Create chapter',

    getCreatedId: () => createdChapterId,

    execute: async () => {
      try {
        const node = await window.electronAPI.tomes.createChapter(params.structure, params.parentId)
        createdChapterId = node.id
        const all = await window.electronAPI.tree.getAll()
        useAppStore.getState().setNodes(all)
      } catch (err) {
        console.error('Create chapter failed:', err)
      }
    },

    undo: async () => {
      if (!createdChapterId) return
      try {
        const updated = await window.electronAPI.tree.permanentDelete(createdChapterId)
        syncNodes(updated)
        const { selectedNodeId, setSelectedNodeId } = useAppStore.getState()
        if (selectedNodeId === createdChapterId) setSelectedNodeId(null)
      } catch (err) {
        console.error('Undo create chapter failed:', err)
      }
    }
  }
}

export function makeRenameCommand(params: {
  id: string
  oldTitle: string
  newTitle: string
}): StructuralCommand {
  return {
    description: `Rename to "${params.newTitle}"`,

    execute: async () => {
      try {
        const updated = await window.electronAPI.tree.update(params.id, { title: params.newTitle })
        useAppStore.getState().updateNodeInStore(params.id, { title: updated.title })
      } catch (err) {
        console.error('Rename failed:', err)
      }
    },

    undo: async () => {
      try {
        const updated = await window.electronAPI.tree.update(params.id, { title: params.oldTitle })
        useAppStore.getState().updateNodeInStore(params.id, { title: updated.title })
      } catch (err) {
        console.error('Undo rename failed:', err)
      }
    }
  }
}

export function makeMoveToTrashCommand(params: { node: TreeNode }): StructuralCommand {
  const { node } = params
  const originalParentId = node.parentId

  return {
    description: `Move "${node.title}" to trash`,

    execute: async () => {
      try {
        const updated = await window.electronAPI.tree.moveToTrash(node.id)
        syncNodes(updated)
      } catch (err) {
        console.error('Move to trash failed:', err)
      }
    },

    undo: async () => {
      try {
        const updated = await window.electronAPI.tree.restore(node.id, originalParentId ?? undefined)
        syncNodes(updated)
      } catch (err) {
        console.error('Undo move to trash failed:', err)
      }
    }
  }
}

export function makeReorderCommand(params: {
  previousNodes: TreeNode[]
  newItems: { id: string; parentId: string | null; sortOrder: number }[]
}): StructuralCommand {
  const idSet = new Set(params.newItems.map((i) => i.id))
  const oldItems = params.previousNodes
    .filter((n) => idSet.has(n.id))
    .map((n) => ({ id: n.id, parentId: n.parentId, sortOrder: n.sortOrder }))

  return {
    description: 'Reorder',

    execute: async () => {
      try {
        const updated = await window.electronAPI.tree.reorder(params.newItems)
        syncNodes(updated)
      } catch (err) {
        console.error('Reorder failed:', err)
      }
    },

    undo: async () => {
      try {
        const updated = await window.electronAPI.tree.reorder(oldItems)
        syncNodes(updated)
      } catch (err) {
        console.error('Undo reorder failed:', err)
      }
    }
  }
}

export function makeReparentCommand(params: {
  nodeId: string
  oldParentId: string | null
  newParentId: string
}): StructuralCommand {
  return {
    description: 'Move into folder',

    execute: async () => {
      try {
        const updated = await window.electronAPI.tree.update(params.nodeId, {
          parentId: params.newParentId
        })
        useAppStore.getState().updateNodeInStore(params.nodeId, { parentId: updated.parentId })
        const all = await window.electronAPI.tree.getAll()
        useAppStore.getState().setNodes(all)
      } catch (err) {
        console.error('Reparent failed:', err)
      }
    },

    undo: async () => {
      try {
        const updated = await window.electronAPI.tree.update(params.nodeId, {
          parentId: params.oldParentId
        })
        useAppStore.getState().updateNodeInStore(params.nodeId, { parentId: updated.parentId })
        const all = await window.electronAPI.tree.getAll()
        useAppStore.getState().setNodes(all)
      } catch (err) {
        console.error('Undo reparent failed:', err)
      }
    }
  }
}
