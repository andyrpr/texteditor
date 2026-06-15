import { useCallback, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

const AUTOSAVE_INTERVAL_MS = 30_000

export function useAutosave(content: string, nodeId: string | null): void {
  const setLastSaved = useAppStore((s) => s.setLastSaved)
  const setDirty = useAppStore((s) => s.setDirty)
  const isDirty = useAppStore((s) => s.isDirty)

  const save = useCallback(async () => {
    if (!nodeId || !isDirty) return

    try {
      await window.electronAPI.tree.update(nodeId, { content })
      const result = await window.electronAPI.project.save()
      if (result.success) {
        setLastSaved(result.lastSaved)
      }
    } catch (err) {
      console.error('Autosave failed:', err)
    }
  }, [content, nodeId, isDirty, setLastSaved])

  useEffect(() => {
    if (!nodeId || !isDirty) return
    const timer = setInterval(save, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [save, nodeId, isDirty])

  useEffect(() => {
    const unsubSave = window.electronAPI.on('menu:save', () => save())
    return unsubSave
  }, [save])
}

export function useKeyboardSave(onSave: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave])
}
