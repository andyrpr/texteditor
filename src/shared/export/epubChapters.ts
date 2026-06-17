import type { DevicePreviewRequestOptions, ExportFormatting, ExportOptions, TreeNode } from '../types'
import { chapterSections, listManuscriptChapters, resolveChapterId } from './manuscript'
import { buildEpubChapterHtml } from './epubHtml'

export type EpubChapterEntry = { title: string; content: string }

export function buildEpubChapterEntries(
  nodes: TreeNode[],
  options: Pick<ExportOptions, 'scope' | 'chapterIds' | 'formatting'>
): EpubChapterEntry[] {
  const { formatting, scope, chapterIds } = options
  let refs = listManuscriptChapters(nodes)

  if (scope === 'chapters') {
    const selected = new Set(chapterIds ?? [])
    refs = refs.filter((ref) => selected.has(ref.id))
  }

  return refs.map((ref) => {
    const chapter = nodes.find((n) => n.id === ref.id)
    if (!chapter) {
      return { title: ref.title, content: '<p></p>' }
    }
    const sections = chapterSections(nodes, chapter)
    return {
      title: chapter.title,
      content: buildEpubChapterHtml(sections, formatting)
    }
  })
}

export function buildPreviewEpubChapterEntries(
  nodes: TreeNode[],
  options: DevicePreviewRequestOptions,
  formatting: ExportFormatting
): EpubChapterEntry[] {
  if (options.scope === 'manuscript') {
    return buildEpubChapterEntries(nodes, { scope: 'manuscript', formatting })
  }

  const chapterId = options.nodeId ?? resolveChapterId(nodes, options.nodeId) ?? listManuscriptChapters(nodes)[0]?.id
  if (!chapterId) {
    return []
  }

  return buildEpubChapterEntries(nodes, {
    scope: 'chapters',
    chapterIds: [chapterId],
    formatting
  })
}
