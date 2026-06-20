import type { BookSettings, DevicePreviewRequestOptions, ExportFormatting, ExportOptions, TreeNode } from '../types'
import { buildFrontMatterBlocks, buildCoverEpubEntry, type EpubFrontMatterEntry } from './frontMatter'
import { chapterSections, listManuscriptChapters, resolveChapterId } from './manuscript'
import { buildEpubChapterHtml } from './epubHtml'

export type EpubChapterEntry = EpubFrontMatterEntry | { title: string; content: string }

export function buildEpubChapterEntries(
  nodes: TreeNode[],
  options: Pick<ExportOptions, 'scope' | 'chapterIds' | 'formatting' | 'title' | 'author'>,
  bookSettings: BookSettings,
  coverImageSrc?: string
): EpubChapterEntry[] {
  const { formatting, scope, chapterIds, title, author } = options
  const allChapters = listManuscriptChapters(nodes)
  let refs = allChapters

  if (scope === 'chapters') {
    const selected = new Set(chapterIds ?? [])
    refs = allChapters.filter((ref) => selected.has(ref.id))
  }

  const { epubEntries: frontMatter } = buildFrontMatterBlocks(bookSettings, { title, author })
  const coverEntry = coverImageSrc ? [buildCoverEpubEntry(coverImageSrc)] : []

  const chapterEntries = refs.map((ref, exportIndex) => {
    const chapter = nodes.find((n) => n.id === ref.id)
    if (!chapter) {
      return { title: ref.title, content: '<p></p>' }
    }
    const chapterNumber =
      bookSettings.chapterNumberingScope === 'export-relative'
        ? exportIndex + 1
        : allChapters.findIndex((c) => c.id === ref.id) + 1
    const sections = chapterSections(nodes, chapter, chapterNumber, bookSettings)
    return {
      title: chapter.title,
      content: buildEpubChapterHtml(sections, formatting, bookSettings)
    }
  })

  return [...coverEntry, ...frontMatter, ...chapterEntries]
}

export function buildPreviewEpubChapterEntries(
  nodes: TreeNode[],
  options: DevicePreviewRequestOptions,
  formatting: ExportFormatting,
  bookSettings: BookSettings,
  meta: { title: string; author: string },
  coverImageSrc?: string
): EpubChapterEntry[] {
  if (options.scope === 'manuscript') {
    return buildEpubChapterEntries(
      nodes,
      { scope: 'manuscript', formatting, title: meta.title, author: meta.author },
      bookSettings,
      coverImageSrc
    )
  }

  const chapterId =
    options.nodeId ?? resolveChapterId(nodes, options.nodeId) ?? listManuscriptChapters(nodes)[0]?.id
  if (!chapterId) {
    return coverImageSrc ? [buildCoverEpubEntry(coverImageSrc)] : []
  }

  return buildEpubChapterEntries(
    nodes,
    {
      scope: 'chapters',
      chapterIds: [chapterId],
      formatting,
      title: meta.title,
      author: meta.author
    },
    bookSettings,
    coverImageSrc
  )
}
