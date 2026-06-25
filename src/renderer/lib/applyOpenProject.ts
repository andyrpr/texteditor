import { useAppStore } from '@/store/appStore'
import { publishNavigationSync } from '@/lib/navigationSync'
import {
  beginUiRestore,
  markUiRestoreComplete,
  resolveProjectUiOnOpen
} from '@/lib/projectUiState'
import type { ProjectMeta, ProjectUiState, TreeNode } from '@shared/types'

export interface OpenProjectResult {
  path: string
  meta: ProjectMeta
  nodes: TreeNode[]
  uiState: ProjectUiState
}

export function applyOpenProjectResult(result: OpenProjectResult): void {
  beginUiRestore()
  const categories = result.meta.categories ?? []
  useAppStore.getState().setProject(result.path, result.meta, result.nodes)
  resolveProjectUiOnOpen(result.uiState, result.nodes, categories)
  markUiRestoreComplete()
  publishNavigationSync()
  useAppStore.getState().setLastSaved(result.meta.updatedAt)
}
