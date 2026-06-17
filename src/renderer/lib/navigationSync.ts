import { useAppStore } from '@/store/appStore'
import type { NavigationSyncState } from '@shared/types'

let suppressNavigationPublish = false

export function isNavigationPublishSuppressed(): boolean {
  return suppressNavigationPublish
}

export function runWithNavigationPublishSuppressed(fn: () => void): void {
  suppressNavigationPublish = true
  try {
    fn()
  } finally {
    suppressNavigationPublish = false
  }
}

export function getNavigationSnapshot(): NavigationSyncState {
  const s = useAppStore.getState()
  return {
    selectedNodeId: s.selectedNodeId,
    selectedContainerId: s.selectedContainerId,
    selectedEntityId: s.selectedEntityId,
    selectedEntityType: s.selectedEntityType,
    expandedSections: [...s.expandedSections],
    expandedFolders: [...s.expandedFolders],
    rightPanelOpen: s.rightPanelOpen,
    sectionOrder: [...s.sectionOrder]
  }
}

function navigationEquals(a: NavigationSyncState, b: NavigationSyncState): boolean {
  return (
    a.selectedNodeId === b.selectedNodeId &&
    a.selectedContainerId === b.selectedContainerId &&
    a.selectedEntityId === b.selectedEntityId &&
    a.selectedEntityType === b.selectedEntityType &&
    a.rightPanelOpen === b.rightPanelOpen &&
    a.expandedSections.length === b.expandedSections.length &&
    a.expandedSections.every((v, i) => v === b.expandedSections[i]) &&
    (a.expandedFolders ?? []).length === (b.expandedFolders ?? []).length &&
    (a.expandedFolders ?? []).every((v, i) => v === (b.expandedFolders ?? [])[i]) &&
    a.sectionOrder.length === b.sectionOrder.length &&
    a.sectionOrder.every((v, i) => v === b.sectionOrder[i])
  )
}

export function applyNavigationSync(nav: NavigationSyncState): void {
  const current = getNavigationSnapshot()
  if (navigationEquals(current, nav)) return

  runWithNavigationPublishSuppressed(() => {
    useAppStore.getState().applyNavigationSync(nav)
  })
}

export function publishNavigationSync(): void {
  if (suppressNavigationPublish) return
  if (typeof window === 'undefined' || !window.electronAPI?.navigation) return

  const snapshot = getNavigationSnapshot()
  void window.electronAPI.navigation.update(snapshot)
}

export async function publishNavigationSyncAsync(): Promise<void> {
  if (suppressNavigationPublish) return
  if (typeof window === 'undefined' || !window.electronAPI?.navigation) return

  const snapshot = getNavigationSnapshot()
  await window.electronAPI.navigation.update(snapshot)
}
