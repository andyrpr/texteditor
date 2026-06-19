import { buildPreviewEpubChapterEntries } from '@shared/export/epubChapters'
import {
  DEFAULT_BOOK_SETTINGS,
  DEFAULT_EXPORT_FORMATTING,
  type DevicePreviewRequestOptions,
  type ProjectMeta,
  type TreeNode
} from '@shared/types'
import { buildEpubBuffer } from '../../export/buildEpubBuffer'
import { resolveCoverFileUrl } from '../../export/resolveCoverFileUrl'

export async function generatePreviewEpub(
  nodes: TreeNode[],
  options: DevicePreviewRequestOptions,
  meta: ProjectMeta
): Promise<ArrayBuffer> {
  const bookSettings = meta.bookSettings ?? DEFAULT_BOOK_SETTINGS
  const coverImageSrc = await resolveCoverFileUrl(bookSettings.coverImagePath)
  const content = buildPreviewEpubChapterEntries(
    nodes,
    options,
    DEFAULT_EXPORT_FORMATTING,
    bookSettings,
    { title: meta.title, author: meta.author },
    coverImageSrc
  )

  return buildEpubBuffer(
    {
      title: meta.title,
      author: meta.author,
      genre: meta.genre,
      cover: coverImageSrc
    },
    content
  )
}
