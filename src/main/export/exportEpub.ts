import fse from 'fs-extra'
import type { BookSettings, ExportOptions, ExportSection, TreeNode } from '@shared/types'
import { buildEpubChapterEntries } from '@shared/export/epubChapters'
import { buildEpubBuffer } from './buildEpubBuffer'
import { resolveCoverFileUrl } from './resolveCoverFileUrl'

export async function exportEpub(
  savePath: string,
  options: ExportOptions,
  _sections: ExportSection[],
  nodes: TreeNode[],
  bookSettings: BookSettings
): Promise<void> {
  const coverImageSrc = await resolveCoverFileUrl(bookSettings.coverImagePath)
  const content = buildEpubChapterEntries(nodes, options, bookSettings, coverImageSrc)

  const buffer = await buildEpubBuffer(
    {
      title: options.title,
      author: options.author,
      genre: options.genre,
      cover: coverImageSrc
    },
    content
  )
  await fse.writeFile(savePath, Buffer.from(buffer))
}
