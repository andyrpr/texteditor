import type { ChapterMeta, ExportSection, FolderMeta, ManuscriptChapterRef, TreeNode } from '../types'
import { DEFAULT_CHAPTER_META, DEFAULT_FOLDER_META, parseMetadata } from '../types'

function isActive(node: TreeNode): boolean {
  return !node.deletedAt
}

function isFolder(node: TreeNode): boolean {
  return node.type === 'folder'
}

function getFolderScope(node: TreeNode): string | null {
  if (node.type !== 'folder') return null
  const meta = parseMetadata<FolderMeta>(node.metadata, DEFAULT_FOLDER_META)
  return meta.scope
}

function isSimpleChapter(node: TreeNode): boolean {
  const meta = parseMetadata<ChapterMeta>(node.metadata, DEFAULT_CHAPTER_META)
  return node.type === 'chapter' && meta.structure === 'simple'
}

function isChapterFolder(node: TreeNode): boolean {
  if (node.type !== 'chapter') return false
  const meta = parseMetadata<ChapterMeta>(node.metadata, DEFAULT_CHAPTER_META)
  return meta.structure === 'scenes'
}

function getManuscriptChildren(nodes: TreeNode[], parentId: string | null): TreeNode[] {
  return nodes
    .filter((n) => {
      if (!isActive(n)) return false
      if ((n.parentId ?? null) !== parentId) return false
      if (n.type === 'folder') return getFolderScope(n) === 'manuscript'
      return n.type === 'chapter'
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function getScenes(nodes: TreeNode[], chapterId: string): TreeNode[] {
  return nodes
    .filter((n) => isActive(n) && n.parentId === chapterId && n.type === 'scene')
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function chapterSections(nodes: TreeNode[], chapter: TreeNode): ExportSection[] {
  if (isSimpleChapter(chapter)) {
    return [
      {
        id: chapter.id,
        title: chapter.title,
        level: 'chapter',
        html: chapter.content
      }
    ]
  }

  if (isChapterFolder(chapter)) {
    const scenes = getScenes(nodes, chapter.id)
    if (scenes.length === 0) {
      return [
        {
          id: chapter.id,
          title: chapter.title,
          level: 'chapter',
          html: ''
        }
      ]
    }
    return scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      level: 'scene' as const,
      html: scene.content
    }))
  }

  return []
}

function collectChaptersDepthFirst(
  nodes: TreeNode[],
  parentId: string | null,
  pathPrefix: string,
  out: ManuscriptChapterRef[]
): void {
  for (const child of getManuscriptChildren(nodes, parentId)) {
    if (isFolder(child)) {
      const nextPrefix = pathPrefix ? `${pathPrefix} / ${child.title}` : child.title
      collectChaptersDepthFirst(nodes, child.id, nextPrefix, out)
      continue
    }
    if (child.type === 'chapter') {
      out.push({
        id: child.id,
        title: child.title,
        pathLabel: pathPrefix ? `${pathPrefix} / ${child.title}` : child.title
      })
    }
  }
}

export function listManuscriptChapters(nodes: TreeNode[]): ManuscriptChapterRef[] {
  const out: ManuscriptChapterRef[] = []
  collectChaptersDepthFirst(nodes, null, '', out)
  return out
}

export function resolveChapterId(nodes: TreeNode[], nodeId: string | null | undefined): string | null {
  if (!nodeId) return null
  const node = nodes.find((n) => n.id === nodeId && isActive(n))
  if (!node) return null
  if (node.type === 'chapter') return node.id
  if (node.type === 'scene' && node.parentId) return node.parentId
  return null
}

function sectionsForChapterRefs(nodes: TreeNode[], refs: ManuscriptChapterRef[]): ExportSection[] {
  const sections: ExportSection[] = []
  for (const ref of refs) {
    const chapter = nodes.find((n) => n.id === ref.id && isActive(n))
    if (!chapter || chapter.type !== 'chapter') continue
    sections.push(...chapterSections(nodes, chapter))
  }
  return sections
}

export function collectSections(
  nodes: TreeNode[],
  scope: 'chapters' | 'manuscript',
  chapterIds?: string[]
): ExportSection[] {
  const allChapters = listManuscriptChapters(nodes)

  if (scope === 'manuscript') {
    return sectionsForChapterRefs(nodes, allChapters)
  }

  const selected = new Set(chapterIds ?? [])
  const refs = allChapters.filter((ref) => selected.has(ref.id))
  return sectionsForChapterRefs(nodes, refs)
}

export function hasExportableContent(sections: ExportSection[]): boolean {
  return sections.some((s) => s.title.trim() || s.html.replace(/<[^>]*>/g, '').trim())
}
