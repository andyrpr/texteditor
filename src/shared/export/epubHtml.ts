import type { ExportFontFamily, ExportFormatting, ExportSection } from '../types'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fontCssFamily(family: ExportFontFamily): string {
  return family === 'serif'
    ? 'Georgia, "Times New Roman", Times, serif'
    : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
}

function normalizeTitle(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Remove a leading h1 when it duplicates the chapter title epub-gen will prepend. */
export function stripLeadingTitleHeading(html: string, title: string): string {
  const normalizedTitle = normalizeTitle(title)
  if (!normalizedTitle) return html

  const match = html.match(/^<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>\s*/i)
  if (!match) return html

  const headingText = match[1].replace(/<[^>]*>/g, '')
  if (normalizeTitle(headingText) !== normalizedTitle) return html

  const rest = html.slice(match[0].length).trim()
  return rest || '<p></p>'
}

function sectionBody(section: ExportSection): string {
  if (section.level === 'scene') {
    return `<h2>${escapeHtml(section.title)}</h2>${section.html || '<p></p>'}`
  }
  if (section.level === 'chapter') {
    if (!section.html.trim()) return ''
    return stripLeadingTitleHeading(section.html, section.title)
  }
  return section.html || '<p></p>'
}

export function buildEpubChapterHtml(
  sections: ExportSection[],
  formatting: ExportFormatting
): string {
  const font = fontCssFamily(formatting.fontFamily)
  const fontSize = `${formatting.fontSize}pt`
  const body = sections.map((s) => sectionBody(s)).join('\n')

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: ${font}; font-size: ${fontSize}; line-height: 1.6; }
    h1 { font-size: 1.75em; margin: 0 0 0.75em; }
    h2 { font-size: 1.35em; margin: 1.25em 0 0.5em; }
    p { margin: 0 0 0.75em; }
    ul, ol { margin: 0 0 0.75em 1.5em; }
    blockquote { margin: 0 0 0.75em; padding-left: 1em; border-left: 3px solid #ccc; }
  </style>
</head>
<body>${body}</body>
</html>`
}
