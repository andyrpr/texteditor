import type { BookSettings, ExportFormatting, ExportSection } from '../types'
import { paragraphBodyCss } from './frontMatter'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fontCssFamily(family: ExportFormatting['fontFamily']): string {
  return family === 'serif'
    ? 'Georgia, "Times New Roman", Times, serif'
    : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
}

function sectionBody(section: ExportSection, settings: BookSettings): string {
  const parts: string[] = []

  if (section.sceneBreakBefore && settings.sceneBreakMarker) {
    parts.push(`<p class="scene-break">${escapeHtml(settings.sceneBreakMarker)}</p>`)
  }

  if (section.displayHeading) {
    const tag = section.level === 'chapter' ? 'h1' : 'h2'
    parts.push(`<${tag}>${escapeHtml(section.displayHeading)}</${tag}>`)
  }

  if (section.html.trim()) {
    parts.push(section.html)
  } else if (!section.displayHeading) {
    parts.push('<p></p>')
  }

  return parts.join('')
}

export function buildEpubChapterHtml(
  sections: ExportSection[],
  formatting: ExportFormatting,
  bookSettings: BookSettings
): string {
  const font = fontCssFamily(formatting.fontFamily)
  const fontSize = `${formatting.fontSize}pt`
  const body = sections.map((s) => sectionBody(s, bookSettings)).join('\n')

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: ${font}; font-size: ${fontSize}; line-height: 1.6; }
    h1 { font-size: 1.75em; margin: 0 0 0.75em; }
    h2 { font-size: 1.35em; margin: 1.25em 0 0.5em; }
    ${paragraphBodyCss(bookSettings)}
    ul, ol { margin: 0 0 0.75em 1.5em; }
    blockquote { margin: 0 0 0.75em; padding-left: 1em; border-left: 3px solid #ccc; }
    .scene-break { text-align: center; margin: 1.5em 0; }
  </style>
</head>
<body>${body}</body>
</html>`
}
