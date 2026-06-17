import type { ExportFontFamily, ExportFormatting, ExportMarginPreset, ExportPageSize } from '@shared/types'

export function marginInches(preset: ExportMarginPreset): number {
  switch (preset) {
    case 'narrow':
      return 0.5
    case 'wide':
      return 1.5
    default:
      return 1
  }
}

export function fontCssFamily(family: ExportFontFamily): string {
  return family === 'serif'
    ? 'Georgia, "Times New Roman", Times, serif'
    : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
}

export function docxFontName(family: ExportFontFamily): string {
  return family === 'serif' ? 'Georgia' : 'Calibri'
}

export function pageDimensions(pageSize: ExportPageSize): { width: number; height: number } {
  if (pageSize === 'a4') {
    return { width: 11906, height: 16838 }
  }
  return { width: 12240, height: 15840 }
}

export function pdfPageSize(pageSize: ExportPageSize): 'A4' | 'Letter' {
  return pageSize === 'a4' ? 'A4' : 'Letter'
}

export function marginCss(formatting: ExportFormatting): string {
  const inches = marginInches(formatting.marginPreset)
  return `${inches}in`
}
