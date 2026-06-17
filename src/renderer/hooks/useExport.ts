import { useCallback, useState } from 'react'
import { useToastStore } from '@/components/UI/toast'
import { flushAllDirty } from '@/lib/contentPersistence'
import type { ExportOptions } from '@shared/types'

export function useExport(): {
  runExport: (options: ExportOptions) => Promise<boolean>
  exporting: boolean
} {
  const addToast = useToastStore((s) => s.addToast)
  const [exporting, setExporting] = useState(false)

  const runExport = useCallback(
    async (options: ExportOptions): Promise<boolean> => {
      setExporting(true)
      try {
        await flushAllDirty()
        const result = await window.electronAPI.export.document(options)
        if (result.success) {
          addToast(result.path ? `Exported to ${result.path}` : 'Export complete', 'default')
          return true
        }
        if (result.message && result.message !== 'Cancelled') {
          addToast(result.message, 'warning')
        }
        return false
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Export failed', 'warning')
        return false
      } finally {
        setExporting(false)
      }
    },
    [addToast]
  )

  return { runExport, exporting }
}
