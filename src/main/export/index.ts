import type { ExportOptions, ProjectMeta, TreeNode } from '@shared/types'
import { collectSections, hasExportableContent } from '@shared/export/manuscript'
import { exportDocx } from './exportDocx'
import { exportEpub } from './exportEpub'
import { exportPdf } from './exportPdf'

export interface ExportResult {
  success: boolean
  message?: string
  path?: string
}

export async function exportDocument(
  savePath: string,
  options: ExportOptions,
  nodes: TreeNode[],
  _meta: ProjectMeta | null
): Promise<ExportResult> {
  try {
    if (options.scope === 'chapters' && (!options.chapterIds || options.chapterIds.length === 0)) {
      return { success: false, message: 'Select at least one chapter to export.' }
    }

    const sections = collectSections(nodes, options.scope, options.chapterIds)

    if (!hasExportableContent(sections)) {
      return { success: false, message: 'Nothing to export.' }
    }

    switch (options.format) {
      case 'docx':
        await exportDocx(savePath, options, sections)
        break
      case 'epub':
        await exportEpub(savePath, options, sections, nodes)
        break
      case 'pdf':
        await exportPdf(savePath, options, sections)
        break
      default:
        return { success: false, message: 'Unsupported export format.' }
    }

    return { success: true, path: savePath }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed.'
    return { success: false, message }
  }
}
