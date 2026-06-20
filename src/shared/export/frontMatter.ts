import type { BookSettings } from '../types'

export type EpubFrontMatterEntry = {
  title: string
  content: string
  excludeFromToc: boolean
  beforeToc: boolean
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtmlParagraphs(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return '<p></p>'
  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('\n')
}

function titlePageHtml(title: string, author: string): string {
  return `<div class="title-page">
    <h1>${escapeHtml(title)}</h1>
    ${author ? `<p class="author">${escapeHtml(author)}</p>` : ''}
  </div>`
}

function dedicationPageHtml(text: string): string {
  return `<div class="dedication-page">${textToHtmlParagraphs(text)}</div>`
}

function copyrightPageHtml(text: string): string {
  return `<div class="copyright-page">${textToHtmlParagraphs(text)}</div>`
}

function frontMatterBodyHtml(inner: string, extraCss = ''): string {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  ${extraCss ? `<style>${extraCss}</style>` : ''}
</head>
<body>${inner}</body>
</html>`
}

const COVER_PAGE_CSS = `
  body { margin: 0; padding: 0; }
  .cover-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
  .cover-page img { max-width: 100%; max-height: 100vh; object-fit: contain; }
`

function coverPageHtml(imageSrc: string): string {
  return `<div class="cover-page"><img src="${escapeHtml(imageSrc)}" alt="Cover" /></div>`
}

export function buildCoverEpubEntry(coverImageSrc: string): EpubFrontMatterEntry {
  return {
    title: 'Cover',
    content: frontMatterBodyHtml(coverPageHtml(coverImageSrc), COVER_PAGE_CSS),
    excludeFromToc: true,
    beforeToc: true
  }
}

export function buildFrontMatterBlocks(
  settings: BookSettings,
  meta: { title: string; author: string }
): { htmlBlocks: string[]; epubEntries: EpubFrontMatterEntry[] } {
  const htmlBlocks: string[] = []
  const epubEntries: EpubFrontMatterEntry[] = []

  if (settings.includeTitlePage) {
    const html = titlePageHtml(meta.title, meta.author)
    htmlBlocks.push(html)
    epubEntries.push({
      title: meta.title,
      content: frontMatterBodyHtml(html),
      excludeFromToc: true,
      beforeToc: true
    })
  }

  if (settings.dedication.trim()) {
    const html = dedicationPageHtml(settings.dedication)
    htmlBlocks.push(html)
    epubEntries.push({
      title: 'Dedication',
      content: frontMatterBodyHtml(html),
      excludeFromToc: true,
      beforeToc: true
    })
  }

  if (settings.copyrightText.trim()) {
    const html = copyrightPageHtml(settings.copyrightText)
    htmlBlocks.push(html)
    epubEntries.push({
      title: 'Copyright',
      content: frontMatterBodyHtml(html),
      excludeFromToc: true,
      beforeToc: true
    })
  }

  return { htmlBlocks, epubEntries }
}

export function paragraphBodyCss(settings: BookSettings): string {
  const align = settings.textAlign === 'justify' ? 'justify' : 'left'
  if (settings.paragraphStyle === 'first-line-indent') {
    return `p { margin: 0 0 0.75em; text-align: ${align}; text-indent: 1.5em; }
    p:first-child, h1 + p, h2 + p { text-indent: 0; }`
  }
  return `p { margin: 0 0 1.25em; text-align: ${align}; }`
}
