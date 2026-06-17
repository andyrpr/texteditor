import fse from 'fs-extra'
import { BrowserWindow } from 'electron'
import type { ExportFormatting, ExportOptions, ExportSection } from '@shared/types'
import { marginInches, pdfPageSize } from './formatting'
import { buildManuscriptHtml } from './htmlTemplate'

export async function exportPdf(
  savePath: string,
  options: ExportOptions,
  sections: ExportSection[]
): Promise<void> {
  const { title, author, formatting } = options
  const html = buildManuscriptHtml(title, author, sections, formatting)
  const margin = marginInches(formatting.marginPreset)

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    await win.loadURL(dataUrl)

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: pdfPageSize(formatting.pageSize),
      margins: {
        marginType: 'custom',
        top: margin,
        bottom: margin,
        left: margin,
        right: margin
      }
    })

    await fse.writeFile(savePath, pdf)
  } finally {
    if (!win.isDestroyed()) {
      win.close()
    }
  }
}
