import { buildPreviewEpubChapterEntries } from '@shared/export/epubChapters'
import { DEFAULT_EXPORT_FORMATTING, type DevicePreviewRequestOptions, type ProjectMeta, type TreeNode } from '@shared/types'
import { buildEpubBuffer } from '../../export/buildEpubBuffer'

export async function generatePreviewEpub(
  nodes: TreeNode[],
  options: DevicePreviewRequestOptions,
  meta: ProjectMeta
): Promise<ArrayBuffer> {
  const content = buildPreviewEpubChapterEntries(nodes, options, DEFAULT_EXPORT_FORMATTING)
  return buildEpubBuffer(
    {
      title: meta.title,
      author: meta.author,
      genre: meta.genre
    },
    content
  )
}
