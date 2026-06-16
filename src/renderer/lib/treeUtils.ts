import type { ChapterMeta, TreeNode, WikiEntityType } from '@shared/types'
import { DEFAULT_CHAPTER_META, parseMetadata } from '@shared/types'

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
  return isChapterFolder(node)
}

export type ContainerSectionId = 'manuscript' | 'characters' | 'locations' | 'lore' | 'notes'

const WIKI_ENTITY_TYPES = new Set<WikiEntityType>(['character', 'location', 'lore', 'note'])

export function isWikiEntityType(type: TreeNode['type']): type is WikiEntityType {
  return WIKI_ENTITY_TYPES.has(type as WikiEntityType)
}

export function stripHtmlPreview(html: string, maxLen = 100): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 'Empty'
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}
