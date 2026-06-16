import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { applyNavigationSync, publishNavigationSync } from '@/lib/navigationSync'
import type { NavigationSyncState } from '@shared/types'

function navigationChanged(
  state: ReturnType<typeof useAppStore.getState>,
  prev: ReturnType<typeof useAppStore.getState>
): boolean {
  if (state.selectedNodeId !== prev.selectedNodeId) return true
  if (state.selectedContainerId !== prev.selectedContainerId) return true
  if (state.selectedEntityId !== prev.selectedEntityId) return true
  if (state.selectedEntityType !== prev.selectedEntityType) return true
  if (state.rightPanelOpen !== prev.rightPanelOpen) return true
  if (state.sectionOrder.length !== prev.sectionOrder.length) return true
  if (state.sectionOrder.some((v, i) => v !== prev.sectionOrder[i])) return true
  if (state.expandedSections.size !== prev.expandedSections.size) return true
  for (const section of state.expandedSections) {
    if (!prev.expandedSections.has(section)) return true
  }
  return false
}

export async function hydrateNavigationFromMain(): Promise<void> {
  const nav = await window.electronAPI.navigation.get()
  applyNavigationSync(nav)
}

export function useNavigationSync(options?: { skipInitialFetch?: boolean }): void {
  useEffect(() => {
    if (!options?.skipInitialFetch) {
      void hydrateNavigationFromMain()
    }

    const unsub = window.electronAPI.on('sync:navigation', (data: unknown) => {
      applyNavigationSync(data as NavigationSyncState)
    })

    return unsub
  }, [options?.skipInitialFetch])
}

export function useNavigationSyncPublisher(
  enabled: boolean,
  options?: { publishOnMount?: boolean }
): void {
  const publishOnMount = options?.publishOnMount ?? true

  useEffect(() => {
    if (!enabled) return

    if (publishOnMount) {
      publishNavigationSync()
    }

    return useAppStore.subscribe((state, prev) => {
      if (navigationChanged(state, prev)) {
        publishNavigationSync()
      }
    })
  }, [enabled, publishOnMount])
}
