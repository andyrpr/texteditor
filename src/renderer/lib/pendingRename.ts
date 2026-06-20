import { useAppStore, type PendingRenameTarget } from '@/store/appStore'
import { getCategoryScopedChildren, getFolderScope, isFolder } from '@/lib/treeUtils'
import { BUILTIN_CATEGORY_IDS } from '@shared/types'
import type { FolderScope, TreeNode } from '@shared/types'

export type { PendingRenameTarget }

const WIKI_TYPE_TO_LEGACY_SECTION: Partial<Record<TreeNode['type'], string>> = {
  character: 'characters',
  location: 'locations',
  lore: 'lore',
  note: 'notes'
}

const WIKI_TYPE_TO_CATEGORY_ID: Partial<Record<TreeNode['type'], string>> = {
  character: BUILTIN_CATEGORY_IDS.characters,
  location: BUILTIN_CATEGORY_IDS.locations,
  lore: BUILTIN_CATEGORY_IDS.lore,
  note: BUILTIN_CATEGORY_IDS.notes
}

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

  const legacySection = WIKI_TYPE_TO_LEGACY_SECTION[node.type]
  const categoryId = WIKI_TYPE_TO_CATEGORY_ID[node.type]
  if (legacySection) {
    ensureSectionExpanded(legacySection)
    if (categoryId) ensureSectionExpanded(categoryId)
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
    characters: BUILTIN_CATEGORY_IDS.characters,
    locations: BUILTIN_CATEGORY_IDS.locations,
    lore: BUILTIN_CATEGORY_IDS.lore,
    notes: BUILTIN_CATEGORY_IDS.notes
  }[scope]
  if (categoryId) ensureSectionExpanded(categoryId)
}

export function requestSidebarRenameAfterCreate(createdId: string | null | undefined): void {
  if (!createdId) return
  expandSidebarToNode(createdId)
  useAppStore.getState().requestRename(createdId, 'sidebar')
}
