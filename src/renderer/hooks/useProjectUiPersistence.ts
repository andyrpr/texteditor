import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { captureProjectUiState, isUiRestoreInProgress } from '@/lib/projectUiState'

const DEBOUNCE_MS = 500

function navigationChanged(
  state: ReturnType<typeof useAppStore.getState>,
  prev: ReturnType<typeof useAppStore.getState>
): boolean {
  if (state.selectedNodeId !== prev.selectedNodeId) return true
  if (state.selectedContainerId !== prev.selectedContainerId) return true
  if (state.selectedEntityId !== prev.selectedEntityId) return true
  if (state.selectedEntityType !== prev.selectedEntityType) return true
  if (state.selectedEntryId !== prev.selectedEntryId) return true
  if (state.selectedEntryCategoryId !== prev.selectedEntryCategoryId) return true
  if (state.rightPanelOpen !== prev.rightPanelOpen) return true
  if (state.sectionOrder.length !== prev.sectionOrder.length) return true
  if (state.sectionOrder.some((v, i) => v !== prev.sectionOrder[i])) return true
  if (state.expandedSections.size !== prev.expandedSections.size) return true
  for (const section of state.expandedSections) {
    if (!prev.expandedSections.has(section)) return true
  }
  if (state.expandedFolders.size !== prev.expandedFolders.size) return true
  for (const folder of state.expandedFolders) {
    if (!prev.expandedFolders.has(folder)) return true
  }
  return false
}

export function useProjectUiPersistence(enabled: boolean): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const flush = (): void => {
      if (isUiRestoreInProgress()) return
      if (!useAppStore.getState().isProjectOpen) return
      void window.electronAPI.tomes.updateUiState(captureProjectUiState())
    }

    const schedule = (): void => {
      if (isUiRestoreInProgress()) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        flush()
      }, DEBOUNCE_MS)
    }

    const unsub = useAppStore.subscribe((state, prev) => {
      if (!state.isProjectOpen) return
      if (navigationChanged(state, prev)) {
        schedule()
      }
    })

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled])
}
