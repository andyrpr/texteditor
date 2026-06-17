import fse from 'fs-extra'
import epubGen from 'epub-gen-memory'
import type { ExportOptions, ExportSection, TreeNode } from '@shared/types'
import { chapterSections, listManuscriptChapters } from '@shared/export/manuscript'
import { buildEpubChapterHtml } from './htmlTemplate'

function buildEpubChapters(
  nodes: TreeNode[],
  options: ExportOptions
): { title: string; data: string }[] {
  const { formatting, scope, chapterIds } = options
  let refs = listManuscriptChapters(nodes)

  if (scope === 'chapters') {
    const selected = new Set(chapterIds ?? [])
    refs = refs.filter((ref) => selected.has(ref.id))
  }

  return refs.map((ref) => {
    const chapter = nodes.find((n) => n.id === ref.id)
    if (!chapter) {
      return { title: ref.title, data: '<p></p>' }
    }
    const sections = chapterSections(nodes, chapter)
    return {
      title: chapter.title,
      data: buildEpubChapterHtml(sections, formatting)
    }
  })
}

export async function exportEpub(
  savePath: string,
  options: ExportOptions,
  _sections: ExportSection[],
  nodes: TreeNode[]
): Promise<void> {
  const { title, author, genre } = options

  const content = buildEpubChapters(nodes, options)

  const epubOptions = {
    title,
    author: author || 'Unknown',
    publisher: 'Priama',
    lang: 'en',
    tocTitle: 'Table of Contents',
    appendChapterTitles: true,
    ...(genre ? { tags: genre } : {})
  }

  const generateEpub =
    typeof epubGen === 'function'
      ? epubGen
      : (epubGen as { default: typeof epubGen }).default

  const buffer = await generateEpub(epubOptions, content)
  await fse.writeFile(savePath, buffer)
}
