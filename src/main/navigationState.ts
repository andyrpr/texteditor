import type { NavigationSyncState } from '@shared/types'
import { DEFAULT_SECTION_ORDER } from '@shared/types'

const DEFAULT_EXPANDED = ['manuscript', 'characters', 'locations', 'lore', 'notes']

const DEFAULT: NavigationSyncState = {
  selectedNodeId: null,
  selectedContainerId: null,
  selectedEntityId: null,
  selectedEntityType: null,
  expandedSections: [...DEFAULT_EXPANDED],
  rightPanelOpen: true,
  sectionOrder: [...DEFAULT_SECTION_ORDER]
}

let state: NavigationSyncState = { ...DEFAULT }

export function getNavigationState(): NavigationSyncState {
  return state
}

export function setNavigationState(next: NavigationSyncState): NavigationSyncState {
  state = next
  return state
}

export function resetNavigationState(): void {
  state = { ...DEFAULT, expandedSections: [...DEFAULT_EXPANDED], sectionOrder: [...DEFAULT_SECTION_ORDER] }
}
