import epubGen from 'epub-gen-memory'
import type { EpubChapterEntry } from '@shared/export/epubChapters'

export interface EpubMetadata {
  title: string
  author: string
  genre?: string
  cover?: string
}

export async function buildEpubBuffer(
  meta: EpubMetadata,
  content: EpubChapterEntry[]
): Promise<ArrayBuffer> {
  const epubOptions = {
    title: meta.title,
    author: meta.author || 'Unknown',
    publisher: 'Priama',
    lang: 'en',
    tocTitle: 'Table of Contents',
    prependChapterTitles: false,
    ...(meta.genre ? { tags: meta.genre } : {}),
    ...(meta.cover ? { cover: meta.cover } : {})
  }

  const generateEpub =
    typeof epubGen === 'function'
      ? epubGen
      : (epubGen as { default: typeof epubGen }).default

  const buffer = await generateEpub(epubOptions, content)
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}
