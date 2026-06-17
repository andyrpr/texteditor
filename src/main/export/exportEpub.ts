import fse from 'fs-extra'
import type { ExportOptions, ExportSection, TreeNode } from '@shared/types'
import { buildEpubChapterEntries } from '@shared/export/epubChapters'
import { buildEpubBuffer } from './buildEpubBuffer'

export async function exportEpub(
  savePath: string,
  options: ExportOptions,
  _sections: ExportSection[],
  nodes: TreeNode[]
): Promise<void> {
  const content = buildEpubChapterEntries(nodes, options)
  const buffer = await buildEpubBuffer(
    {
      title: options.title,
      author: options.author,
      genre: options.genre
    },
    content
  )
  await fse.writeFile(savePath, Buffer.from(buffer))
}
