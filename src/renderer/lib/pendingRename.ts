import { useAppStore, type PendingRenameTarget } from '@/store/appStore'
import { getCategoryScopedChildren, getFolderScope, isFolder } from '@/lib/treeUtils'
import {
  categoryIdForWikiNodeType,
  legacySectionForWikiNodeType,
  WIKI_NODE_TYPE_TO_CATEGORY_ID
} from '@shared/categoryNodeKind'
import type { FolderScope, TreeNode } from '@shared/types'

export type { PendingRenameTarget }

function ensureSectionExpanded(sectionId: string): void {
  const { expandedSections, toggleSection } = useAppStore.getState()
  if (!expandedSections.has(sectionId)) toggleSection(sectionId)
}

/** After creating a node, open inline rename in the sidebar tree or container cards. */
export function requestRenameAfterCreate(
  createdId: string | null | undefined,
  target: PendingRenameTarget
): void {
  if (createdId) {
    useAppStore.getState().requestRename(createdId, target)
  }
}

export function expandSidebarToNode(nodeId: string): void {
  const state = useAppStore.getState()
  const node = state.nodes.find((n) => n.id === nodeId)
  if (!node) return

  let current: TreeNode | undefined = node
  const folderIds: string[] = []
  while (current?.parentId) {
    folderIds.push(current.parentId)
    current = state.nodes.find((n) => n.id === current!.parentId)
  }
  for (const folderId of folderIds.reverse()) {
    if (!state.expandedFolders.has(folderId)) {
      state.toggleFolder(folderId)
    }
  }

  if ((node.parentId ?? null) !== null) return

  if (node.type === 'chapter' || node.type === 'scene') {
    ensureSectionExpanded('manuscript')
    return
  }

  if (node.type === 'entry' && node.categoryId) {
    ensureSectionExpanded(node.categoryId)
    return
  }

  const legacySection = legacySectionForWikiNodeType(node.type)
  const categoryId = categoryIdForWikiNodeType(node.type)
  if (categoryId) {
    ensureSectionExpanded(categoryId)
    return
  }
  if (legacySection) {
    ensureSectionExpanded(legacySection)
    return
  }

  if (isFolder(node)) {
    const scope = getFolderScope(node) ?? 'manuscript'
    expandSectionForScope(state.nodes, state.categories, scope, node.id)
  }
}

function expandSectionForScope(
  nodes: TreeNode[],
  categories: { id: string }[],
  scope: FolderScope,
  folderId: string
): void {
  if (scope === 'manuscript') {
    ensureSectionExpanded('manuscript')
    return
  }
  if (scope === 'entry') {
    for (const cat of categories) {
      if (getCategoryScopedChildren(nodes, null, cat.id).some((n) => n.id === folderId)) {
        ensureSectionExpanded(cat.id)
        return
      }
    }
    return
  }
  ensureSectionExpanded(scope)
  const categoryId = {
    characters: WIKI_NODE_TYPE_TO_CATEGORY_ID.character,
    locations: WIKI_NODE_TYPE_TO_CATEGORY_ID.location,
    lore: WIKI_NODE_TYPE_TO_CATEGORY_ID.lore,
    notes: WIKI_NODE_TYPE_TO_CATEGORY_ID.note
  }[scope as 'characters' | 'locations' | 'lore' | 'notes']
  if (categoryId) ensureSectionExpanded(categoryId)
}

export function requestSidebarRenameAfterCreate(createdId: string | null | undefined): void {
  if (!createdId) return
  expandSidebarToNode(createdId)
  useAppStore.getState().requestRename(createdId, 'sidebar')
}
