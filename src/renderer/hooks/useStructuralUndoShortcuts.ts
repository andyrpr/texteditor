import { useEffect } from 'react'
import { useHistoryStore } from '@/store/historyStore'

export function useStructuralUndoShortcuts(): void {
  const { undo, redo, canUndo, canRedo } = useHistoryStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (target.isContentEditable) return

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        if (canUndo) void undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        if (canRedo) void redo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, canUndo, canRedo])

  useEffect(() => {
    const unsubUndo = window.electronAPI.on('menu:undo', () => {
      if (useHistoryStore.getState().canUndo) void useHistoryStore.getState().undo()
    })
    const unsubRedo = window.electronAPI.on('menu:redo', () => {
      if (useHistoryStore.getState().canRedo) void useHistoryStore.getState().redo()
    })
    return () => {
      unsubUndo()
      unsubRedo()
    }
  }, [])
}
