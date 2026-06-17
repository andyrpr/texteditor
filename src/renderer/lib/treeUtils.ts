import type {
  ChapterMeta,
  FolderMeta,
  FolderScope,
  NodeType,
  TrashCategory,
  TreeNode,
  WikiEntityType
} from '@shared/types'
import { DEFAULT_CHAPTER_META, DEFAULT_FOLDER_META, parseMetadata } from '@shared/types'

export function isSimpleChapter(node: TreeNode): boolean {
  const meta = parseMetadata<ChapterMeta>(node.metadata, DEFAULT_CHAPTER_META)
  return node.type === 'chapter' && meta.structure === 'simple'
}

export function isChapterFolder(node: TreeNode): boolean {
  if (node.type !== 'chapter') return false
  const meta = parseMetadata<ChapterMeta>(node.metadata, DEFAULT_CHAPTER_META)
  return meta.structure === 'scenes'
}

export function isContainerNode(node: TreeNode): boolean {
  return isChapterFolder(node) || isFolder(node)
}

export function isFolder(node: TreeNode): boolean {
  return node.type === 'folder'
}

export function getFolderScope(node: TreeNode): FolderScope | null {
  if (node.type !== 'folder') return null
  const meta = parseMetadata<FolderMeta>(node.metadata, DEFAULT_FOLDER_META)
  return meta.scope
}

export type ContainerSectionId = 'manuscript' | 'characters' | 'locations' | 'lore' | 'notes'

const WIKI_ENTITY_TYPES = new Set<WikiEntityType>(['character', 'location', 'lore', 'note'])

export function isWikiEntityType(type: TreeNode['type']): type is WikiEntityType {
  return WIKI_ENTITY_TYPES.has(type as WikiEntityType)
}

export function wikiSectionForType(type: WikiEntityType): ContainerSectionId {
  switch (type) {
    case 'character':
      return 'characters'
    case 'location':
      return 'locations'
    case 'lore':
      return 'lore'
    case 'note':
      return 'notes'
  }
}

export function nodeTypeForWikiSection(section: ContainerSectionId): NodeType | null {
  switch (section) {
    case 'characters':
      return 'character'
    case 'locations':
      return 'location'
    case 'lore':
      return 'lore'
    case 'notes':
      return 'note'
    default:
      return null
  }
}

export function folderScopeForSection(section: ContainerSectionId): FolderScope {
  return section
}

export function isActiveNode(node: TreeNode): boolean {
  return !node.deletedAt
}

export function getActiveNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.filter(isActiveNode)
}

export function getTrashNodes(nodes: TreeNode[], category: TrashCategory): TreeNode[] {
  const typeMap: Record<TrashCategory, NodeType> = {
    chapters: 'chapter',
    scenes: 'scene',
    characters: 'character',
    locations: 'location',
    lore: 'lore',
    notes: 'note'
  }
  const type = typeMap[category]
  return nodes
    .filter((n) => n.type === type && n.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function hasTrashItems(nodes: TreeNode[]): boolean {
  return nodes.some((n) => n.deletedAt)
}

export function getTrashCategories(nodes: TreeNode[]): TrashCategory[] {
  const categories: TrashCategory[] = []
  if (nodes.some((n) => n.deletedAt && n.type === 'chapter')) categories.push('chapters')
  if (nodes.some((n) => n.deletedAt && n.type === 'scene')) categories.push('scenes')
  if (nodes.some((n) => n.deletedAt && n.type === 'character')) categories.push('characters')
  if (nodes.some((n) => n.deletedAt && n.type === 'location')) categories.push('locations')
  if (nodes.some((n) => n.deletedAt && n.type === 'lore')) categories.push('lore')
  if (nodes.some((n) => n.deletedAt && n.type === 'note')) categories.push('notes')
  return categories
}

export function isTrashContainerId(id: string): id is `trash:${TrashCategory}` {
  return id.startsWith('trash:')
}

export function parseTrashContainerId(id: string): TrashCategory | null {
  if (!isTrashContainerId(id)) return null
  return id.slice('trash:'.length) as TrashCategory
}

export function isFolderContainerId(id: string): boolean {
  return id.startsWith('folder:')
}

export function parseFolderContainerId(id: string): string | null {
  if (!isFolderContainerId(id)) return null
  return id.slice('folder:'.length)
}

export function folderContainerId(folderId: string): string {
  return `folder:${folderId}`
}

export function trashContainerId(category: TrashCategory): string {
  return `trash:${category}`
}

const MANUSCRIPT_CHILD_TYPES: NodeType[] = ['folder', 'chapter']
const WIKI_CHILD_TYPES: NodeType[] = ['folder', 'character', 'location', 'lore', 'note']

export function getChildTypesForScope(scope: FolderScope): NodeType[] {
  if (scope === 'manuscript') return MANUSCRIPT_CHILD_TYPES
  return [scope.slice(0, -1) as NodeType, 'folder'].filter(Boolean) as NodeType[]
}

export function getChildren(
  nodes: TreeNode[],
  parentId: string | null,
  scope: FolderScope,
  options?: { includeDeleted?: boolean }
): TreeNode[] {
  const activeOnly = !options?.includeDeleted
  const childTypes = scope === 'manuscript' ? MANUSCRIPT_CHILD_TYPES : getWikiChildTypes(scope)

  return nodes
    .filter((n) => {
      if (activeOnly && n.deletedAt) return false
      if ((n.parentId ?? null) !== parentId) return false
      if (n.type === 'folder') {
        return getFolderScope(n) === scope
      }
      if (scope === 'manuscript') {
        return n.type === 'chapter'
      }
      return n.type === scopeToEntityType(scope)
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function getWikiChildTypes(scope: FolderScope): NodeType[] {
  const entityType = scopeToEntityType(scope)
  return ['folder', entityType]
}

function scopeToEntityType(scope: FolderScope): NodeType {
  switch (scope) {
    case 'characters':
      return 'character'
    case 'locations':
      return 'location'
    case 'lore':
      return 'lore'
    case 'notes':
      return 'note'
    default:
      return 'chapter'
  }
}

export function getScenes(nodes: TreeNode[], chapterId: string): TreeNode[] {
  return nodes
    .filter((n) => !n.deletedAt && n.parentId === chapterId && n.type === 'scene')
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getChapters(nodes: TreeNode[], parentId: string | null = null): TreeNode[] {
  return getChildren(nodes, parentId, 'manuscript')
}

export function getNodesByType(nodes: TreeNode[], type: NodeType, parentId: string | null = null): TreeNode[] {
  if (type === 'chapter') {
    return getChapters(nodes, parentId)
  }
  const scope = entityTypeToScope(type)
  if (scope) {
    return getChildren(nodes, parentId, scope)
  }
  return nodes
    .filter((n) => !n.deletedAt && n.type === type && (n.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function entityTypeToScope(type: NodeType): FolderScope | null {
  switch (type) {
    case 'character':
      return 'characters'
    case 'location':
      return 'locations'
    case 'lore':
      return 'lore'
    case 'note':
      return 'notes'
    default:
      return null
  }
}

export function stripHtmlPreview(html: string, maxLen = 100): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 'Empty'
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

export function stripPlainTextPreview(text: string, maxLen = 100): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Empty'
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized
}

export function stripNodeContentPreview(node: TreeNode, maxLen = 100): string {
  if (node.type === 'note') {
    return stripPlainTextPreview(node.content, maxLen)
  }
  if (node.type === 'folder') {
    return 'Folder'
  }
  return stripHtmlPreview(node.content, maxLen)
}

export function countNodeWords(node: TreeNode): number {
  if (node.type === 'folder') return 0
  if (node.type === 'note') {
    const text = node.content.trim()
    if (!text) return 0
    return text.split(/\s+/).filter(Boolean).length
  }
  const text = node.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function getSceneChapters(nodes: TreeNode[]): TreeNode[] {
  return nodes.filter((n) => !n.deletedAt && n.type === 'chapter' && isChapterFolder(n))
}
