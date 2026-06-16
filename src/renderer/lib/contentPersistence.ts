import type { SaveResult } from '@shared/types'
import { useAppStore } from '@/store/appStore'

const DEBOUNCE_MS = 400
const AUTOSAVE_INTERVAL_MS = 30_000

type DirtyEntry = { content: string }

const dirtyNodes = new Map<string, DirtyEntry>()
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const persisting = new Set<string>()

let getActiveEditorContent: (() => { nodeId: string; content: string } | null) | null = null

function syncDirtyFlag(): void {
  const hasPending = dirtyNodes.size > 0 || debounceTimers.size > 0 || persisting.size > 0
  useAppStore.getState().setDirty(hasPending)
}

export function registerActiveEditor(
  getter: (() => { nodeId: string; content: string } | null) | null
): void {
  getActiveEditorContent = getter
}

let getActiveNoteContent: (() => { nodeId: string; content: string } | null) | null = null

export function registerActiveNoteContent(
  getter: (() => { nodeId: string; content: string } | null) | null
): void {
  getActiveNoteContent = getter
}

export function resetPersistenceState(): void {
  for (const timer of debounceTimers.values()) clearTimeout(timer)
  debounceTimers.clear()
  dirtyNodes.clear()
  persisting.clear()
  syncDirtyFlag()
}

function captureActiveEditorContent(): void {
  const active = getActiveEditorContent?.()
  if (active) {
    dirtyNodes.set(active.nodeId, { content: active.content })
  }
  const note = getActiveNoteContent?.()
  if (note) {
    dirtyNodes.set(note.nodeId, { content: note.content })
  }
}

function cancelDebounce(nodeId: string): void {
  const timer = debounceTimers.get(nodeId)
  if (timer) {
    clearTimeout(timer)
    debounceTimers.delete(nodeId)
  }
}

async function persistNode(nodeId: string): Promise<void> {
  const entry = dirtyNodes.get(nodeId)
  if (!entry || persisting.has(nodeId)) return

  persisting.add(nodeId)
  syncDirtyFlag()

  try {
    await window.electronAPI.tree.update(nodeId, { content: entry.content })
    dirtyNodes.delete(nodeId)
  } catch (err) {
    console.error(`Failed to persist node ${nodeId}:`, err)
  } finally {
    persisting.delete(nodeId)
    syncDirtyFlag()
  }
}

function schedulePersist(nodeId: string): void {
  cancelDebounce(nodeId)
  debounceTimers.set(
    nodeId,
    setTimeout(() => {
      debounceTimers.delete(nodeId)
      syncDirtyFlag()
      void persistNode(nodeId)
    }, DEBOUNCE_MS)
  )
  syncDirtyFlag()
}

export function markContentDirty(nodeId: string, content: string): void {
  dirtyNodes.set(nodeId, { content })
  schedulePersist(nodeId)
}

export function hasUnpersistedChanges(): boolean {
  return dirtyNodes.size > 0 || debounceTimers.size > 0 || persisting.size > 0
}

export async function flushNode(nodeId: string): Promise<void> {
  cancelDebounce(nodeId)
  captureActiveEditorContent()
  await persistNode(nodeId)
}

export async function flushAllDirty(): Promise<void> {
  captureActiveEditorContent()
  for (const nodeId of debounceTimers.keys()) cancelDebounce(nodeId)
  const ids = [...dirtyNodes.keys()]
  for (const id of ids) {
    await persistNode(id)
  }
}

export async function flushAndSaveProject(): Promise<SaveResult> {
  await flushAllDirty()
  return window.electronAPI.tomes.saveProject()
}

export { AUTOSAVE_INTERVAL_MS }
