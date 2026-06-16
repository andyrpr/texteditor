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

export function stripPlainTextPreview(text: string, maxLen = 100): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Empty'
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized
}

export function stripNodeContentPreview(node: TreeNode, maxLen = 100): string {
  if (node.type === 'note') {
    return stripPlainTextPreview(node.content, maxLen)
  }
  return stripHtmlPreview(node.content, maxLen)
}

export function countNodeWords(node: TreeNode): number {
  if (node.type === 'note') {
    const text = node.content.trim()
    if (!text) return 0
    return text.split(/\s+/).filter(Boolean).length
  }
  const text = node.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}
