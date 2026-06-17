import type { ExportFormatting, ExportSection } from '@shared/types'
import { fontCssFamily, marginCss } from './formatting'

export { buildEpubChapterHtml } from '@shared/export/epubHtml'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sectionBody(section: ExportSection): string {
  if (section.level === 'chapter' && !section.html.trim()) {
    return `<h1>${escapeHtml(section.title)}</h1>`
  }
  if (section.level === 'scene') {
    return `<h2>${escapeHtml(section.title)}</h2>${section.html || '<p></p>'}`
  }
  if (section.level === 'chapter') {
    return `<h1>${escapeHtml(section.title)}</h1>${section.html || '<p></p>'}`
  }
  return section.html || '<p></p>'
}

export function buildManuscriptHtml(
  title: string,
  author: string,
  sections: ExportSection[],
  formatting: ExportFormatting
): string {
  const body = sections.map((s) => sectionBody(s)).join('\n')
  const font = fontCssFamily(formatting.fontFamily)
  const margin = marginCss(formatting)
  const fontSize = `${formatting.fontSize}pt`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: ${margin}; }
    body {
      font-family: ${font};
      font-size: ${fontSize};
      line-height: 1.6;
      color: #111;
      margin: ${margin};
      max-width: none;
    }
    h1 { font-size: 1.75em; margin: 1.5em 0 0.75em; page-break-before: always; }
    h1:first-child { page-break-before: avoid; margin-top: 0; }
    h2 { font-size: 1.35em; margin: 1.25em 0 0.5em; }
    h3 { font-size: 1.15em; margin: 1em 0 0.5em; }
    h4 { font-size: 1.05em; margin: 0.75em 0 0.5em; }
    p { margin: 0 0 0.75em; }
    ul, ol { margin: 0 0 0.75em 1.5em; }
    blockquote { margin: 0 0 0.75em; padding-left: 1em; border-left: 3px solid #ccc; color: #444; }
    hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    u { text-decoration: underline; }
    .title-page { text-align: center; margin-bottom: 3em; page-break-after: always; }
    .title-page h1 { page-break-before: avoid; font-size: 2em; }
    .title-page .author { font-size: 1.1em; color: #444; margin-top: 0.5em; }
  </style>
</head>
<body>
  <div class="title-page">
    <h1>${escapeHtml(title)}</h1>
    ${author ? `<p class="author">${escapeHtml(author)}</p>` : ''}
  </div>
  ${body}
</body>
</html>`
}
