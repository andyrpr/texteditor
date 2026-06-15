import { useEffect, useState, useCallback } from 'react'
import { X, PanelRightOpen } from 'lucide-react'
import { useAppStore, getSelectedNode } from '@/store/appStore'
import { Button } from '@/components/UI/button'
import { Input } from '@/components/UI/input'
import { Textarea } from '@/components/UI/textarea'
import { ScrollArea } from '@/components/UI/scroll-area'
import {
  DEFAULT_CHARACTER_META,
  DEFAULT_LOCATION_META,
  DEFAULT_LORE_META,
  parseMetadata,
  serializeMetadata
} from '@shared/types'
import type { CharacterMeta, LocationMeta, LoreMeta } from '@shared/types'

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

function CharacterPanel({
  nodeId,
  title,
  metadata,
  onUpdate
}: {
  nodeId: string
  title: string
  metadata: CharacterMeta
  onUpdate: (meta: CharacterMeta, title?: string) => void
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
      <Field label="Aliases (comma-separated)">
        <Input
          value={meta.aliases.join(', ')}
          onChange={(e) =>
            setMeta({ ...meta, aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
          }
          onBlur={save}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Age">
          <Input value={meta.age} onChange={(e) => setMeta({ ...meta, age: e.target.value })} onBlur={save} />
        </Field>
        <Field label="Race">
          <Input value={meta.race} onChange={(e) => setMeta({ ...meta, race: e.target.value })} onBlur={save} />
        </Field>
        <Field label="Gender">
          <Input value={meta.gender} onChange={(e) => setMeta({ ...meta, gender: e.target.value })} onBlur={save} />
        </Field>
      </div>
      <Field label="Physical Description">
        <Textarea value={meta.physicalDescription} onChange={(e) => setMeta({ ...meta, physicalDescription: e.target.value })} onBlur={save} rows={3} />
      </Field>
      <Field label="Personality">
        <Textarea value={meta.personality} onChange={(e) => setMeta({ ...meta, personality: e.target.value })} onBlur={save} rows={3} />
      </Field>
      <Field label="Background">
        <Textarea value={meta.background} onChange={(e) => setMeta({ ...meta, background: e.target.value })} onBlur={save} rows={3} />
      </Field>
      <Field label="Role in Story">
        <Input value={meta.role} onChange={(e) => setMeta({ ...meta, role: e.target.value })} onBlur={save} />
      </Field>
      <Field label="Notes">
        <Textarea value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} onBlur={save} rows={3} />
      </Field>
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

  return (
    <div className="space-y-4">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} />
      </Field>
      <Field label="Type">
        <Input value={meta.type} onChange={(e) => setMeta({ ...meta, type: e.target.value })} onBlur={save} placeholder="city, forest, dungeon..." />
      </Field>
      <Field label="Description">
        <Textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} onBlur={save} rows={4} />
      </Field>
      <Field label="Notes">
        <Textarea value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} onBlur={save} rows={3} />
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
        <Textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} onBlur={save} rows={4} />
      </Field>
      <Field label="Notes">
        <Textarea value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} onBlur={save} rows={3} />
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
    selectedNodeId,
    selectedEntityId,
    selectedEntityType,
    rightPanelOpen,
    rightPanelWidth,
    setRightPanelOpen,
    setSelectedEntity,
    updateNodeInStore,
    setDirty,
    setEntityDetached
  } = useAppStore()

  const entityId = selectedEntityId ?? selectedNodeId
  const node = entityId ? nodes.find((n) => n.id === entityId) : null

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
    void window.electronAPI.windows.detach('entity').then(() => setEntityDetached(true))
  }

  if (!detached && (!rightPanelOpen || !node)) return null

  const isEntity = node && ['character', 'location', 'lore', 'note'].includes(node.type)
  if (!detached && !isEntity && !selectedEntityId) return null
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
              metadata={parseMetadata(node.metadata, DEFAULT_CHARACTER_META)}
              onUpdate={handleUpdate}
            />
          )}
          {panelType === 'location' && (
            <LocationPanel
              nodeId={node.id}
              title={node.title}
              metadata={parseMetadata(node.metadata, DEFAULT_LOCATION_META)}
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
            <Field label="Content">
              <Textarea
                defaultValue={node.content}
                rows={8}
                onBlur={async (e) => {
                  const updated = await window.electronAPI.tree.update(node.id, {
                    content: e.target.value
                  })
                  updateNodeInStore(node.id, { content: updated.content })
                  setDirty(true)
                }}
              />
            </Field>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
