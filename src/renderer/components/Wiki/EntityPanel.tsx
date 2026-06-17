import { useEffect, useState, useCallback } from 'react'
import { X, PanelRightOpen } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/UI/button'
import { Input } from '@/components/UI/input'
import { AutoGrowTextarea } from '@/components/UI/auto-grow-textarea'
import { ScrollArea } from '@/components/UI/scroll-area'
import { CharacterPanel } from '@/components/Wiki/CharacterPanel'
import { EntityImageBanner } from '@/components/Wiki/EntityImageBanner'
import { NotePanel } from '@/components/Wiki/NotePanel'
import { publishNavigationSyncAsync } from '@/lib/navigationSync'
import { useResizeHandle, usePersistLayout } from '@/hooks/useResize'
import { cn } from '@/lib/utils'
import {
  DEFAULT_CHARACTER_META,
  DEFAULT_LOCATION_META,
  DEFAULT_LORE_META,
  DEFAULT_NOTE_META,
  normalizeCharacterMeta,
  normalizeLocationMeta,
  normalizeNoteMeta,
  parseMetadata,
  serializeMetadata,
  RIGHT_PANEL_MIN_WIDTH,
  RIGHT_PANEL_MAX_WIDTH
} from '@shared/types'
import type { CharacterMeta, LocationMeta, LoreMeta, NoteMeta } from '@shared/types'

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function LocationPanel({
  nodeId,
  title,
  metadata,
  onUpdate
}: {
  nodeId: string
  title: string
  metadata: LocationMeta
  onUpdate: (meta: LocationMeta, title?: string) => void
}): React.JSX.Element {
  const [meta, setMeta] = useState(metadata)
  const [name, setName] = useState(title)

  useEffect(() => {
    setMeta(metadata)
    setName(title)
  }, [nodeId, metadata, title])

  const save = useCallback(() => {
    onUpdate(meta, name !== title ? name : undefined)
  }, [meta, name, title, onUpdate])

  const saveMeta = useCallback(
    (next: LocationMeta) => {
      setMeta(next)
      onUpdate(next, name !== title ? name : undefined)
    },
    [name, title, onUpdate]
  )

  return (
    <div className="space-y-4">
      <EntityImageBanner
        nodeId={nodeId}
        title={name}
        imagePath={meta.imagePath}
        entityType="location"
        onImageChange={(imagePath) => saveMeta({ ...meta, imagePath })}
      />

      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} />
      </Field>
      <Field label="Type">
        <Input value={meta.type} onChange={(e) => setMeta({ ...meta, type: e.target.value })} onBlur={save} placeholder="city, forest, dungeon..." />
      </Field>
      <Field label="Description">
        <AutoGrowTextarea measureKey={nodeId} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} onBlur={save} rows={4} />
      </Field>
      <Field label="Notes">
        <AutoGrowTextarea measureKey={nodeId} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} onBlur={save} rows={3} />
      </Field>
    </div>
  )
}

function LorePanel({
  nodeId,
  title,
  metadata,
  onUpdate
}: {
  nodeId: string
  title: string
  metadata: LoreMeta
  onUpdate: (meta: LoreMeta, title?: string) => void
}): React.JSX.Element {
  const [meta, setMeta] = useState(metadata)
  const [name, setName] = useState(title)

  useEffect(() => {
    setMeta(metadata)
    setName(title)
  }, [nodeId, metadata, title])

  const save = useCallback(() => {
    onUpdate(meta, name !== title ? name : undefined)
  }, [meta, name, title, onUpdate])

  return (
    <div className="space-y-4">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} />
      </Field>
      <Field label="Category">
        <Input value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} onBlur={save} placeholder="magic, religion, history..." />
      </Field>
      <Field label="Description">
        <AutoGrowTextarea measureKey={nodeId} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} onBlur={save} rows={4} />
      </Field>
      <Field label="Notes">
        <AutoGrowTextarea measureKey={nodeId} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} onBlur={save} rows={3} />
      </Field>
    </div>
  )
}

interface EntityPanelProps {
  detached?: boolean
}

export function EntityPanel({ detached = false }: EntityPanelProps): React.JSX.Element | null {
  const {
    nodes,
    selectedEntityId,
    selectedEntityType,
    rightPanelWidth,
    setRightPanelOpen,
    setRightPanelWidth,
    setSelectedEntity,
    updateNodeInStore,
    setDirty,
    setEntityDetached
  } = useAppStore()

  const node = selectedEntityId ? nodes.find((n) => n.id === selectedEntityId) : null

  const { handleProps } = useResizeHandle(
    rightPanelWidth,
    setRightPanelWidth,
    RIGHT_PANEL_MIN_WIDTH,
    RIGHT_PANEL_MAX_WIDTH,
    'right'
  )
  usePersistLayout(rightPanelWidth, 'rightPanelWidth')

  const handleNoteUpdate = async (updates: {
    metadata?: NoteMeta
    title?: string
    content?: string
  }) => {
    if (!node) return
    const payload: { metadata?: string; title?: string; content?: string } = {}
    if (updates.metadata) payload.metadata = serializeMetadata(updates.metadata)
    if (updates.title) payload.title = updates.title
    if (updates.content !== undefined) payload.content = updates.content

    const updated = await window.electronAPI.tree.update(node.id, payload)
    const storeUpdates: { metadata?: string; title?: string; content?: string } = {}
    if (updates.metadata) storeUpdates.metadata = updated.metadata
    if (updates.title) storeUpdates.title = updated.title
    if (updates.content !== undefined) storeUpdates.content = updated.content
    updateNodeInStore(node.id, storeUpdates)
    setDirty(true)
  }

  const handleUpdate = async (
    metadata: CharacterMeta | LocationMeta | LoreMeta,
    title?: string
  ) => {
    if (!node) return
    const updates: { metadata: string; title?: string } = {
      metadata: serializeMetadata(metadata)
    }
    if (title) updates.title = title

    const updated = await window.electronAPI.tree.update(node.id, updates)
    updateNodeInStore(node.id, { metadata: updated.metadata, title: updated.title })
    setDirty(true)
  }

  const handleDetach = (): void => {
    void publishNavigationSyncAsync()
      .then(() => window.electronAPI.windows.detach('entity'))
      .then(() => {
        setEntityDetached(true)
      })
  }

  if (!detached && (!selectedEntityId || !node)) return null
  if (detached && !node) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select an entity to view details</p>
      </div>
    )
  }
  if (!node) return null

  const panelType = selectedEntityType ?? node.type

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-l border-border bg-card"
      style={{ width: detached ? '100%' : rightPanelWidth }}
    >
      {!detached && (
        <div
          {...handleProps}
          className={cn(handleProps.className, 'left-0')}
          style={{ left: 0 }}
        />
      )}
      {!detached && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold capitalize">{panelType}</h2>
            <p className="text-xs text-muted-foreground">{node.title}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Detach panel"
              onClick={handleDetach}
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setRightPanelOpen(false)
                setSelectedEntity(null, null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4">
          {panelType === 'character' && (
            <CharacterPanel
              nodeId={node.id}
              title={node.title}
              metadata={normalizeCharacterMeta(
                parseMetadata<CharacterMeta>(node.metadata, DEFAULT_CHARACTER_META)
              )}
              onUpdate={handleUpdate}
            />
          )}
          {panelType === 'location' && (
            <LocationPanel
              nodeId={node.id}
              title={node.title}
              metadata={normalizeLocationMeta(
                parseMetadata<LocationMeta>(node.metadata, DEFAULT_LOCATION_META)
              )}
              onUpdate={handleUpdate}
            />
          )}
          {panelType === 'lore' && (
            <LorePanel
              nodeId={node.id}
              title={node.title}
              metadata={parseMetadata(node.metadata, DEFAULT_LORE_META)}
              onUpdate={handleUpdate}
            />
          )}
          {panelType === 'note' && (
            <NotePanel
              nodeId={node.id}
              title={node.title}
              content={node.content}
              metadata={normalizeNoteMeta(
                parseMetadata<NoteMeta>(node.metadata, DEFAULT_NOTE_META)
              )}
              onUpdate={handleNoteUpdate}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
