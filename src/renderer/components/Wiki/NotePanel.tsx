import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/UI/input'
import { AutoGrowTextarea } from '@/components/UI/auto-grow-textarea'
import { useAppStore } from '@/store/appStore'
import { markContentDirty, registerActiveNoteContent } from '@/lib/contentPersistence'
import type { NoteMeta } from '@shared/types'

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

export function NotePanel({
  nodeId,
  title,
  content,
  metadata,
  onUpdate
}: {
  nodeId: string
  title: string
  content: string
  metadata: NoteMeta
  onUpdate: (updates: { metadata?: NoteMeta; title?: string; content?: string }) => void
}): React.JSX.Element {
  const updateNodeInStore = useAppStore((s) => s.updateNodeInStore)
  const [meta, setMeta] = useState(metadata)
  const [name, setName] = useState(title)
  const [body, setBody] = useState(content)

  useEffect(() => {
    setMeta(metadata)
    setName(title)
    setBody(content)
  }, [nodeId, metadata, title, content])

  useEffect(() => {
    registerActiveNoteContent(() => ({ nodeId, content: body }))
    return () => registerActiveNoteContent(null)
  }, [nodeId, body])

  const saveFields = useCallback(() => {
    onUpdate({
      metadata: meta,
      ...(name !== title ? { title: name } : {})
    })
  }, [meta, name, title, onUpdate])

  const handleBodyChange = (next: string): void => {
    setBody(next)
    updateNodeInStore(nodeId, { content: next })
    markContentDirty(nodeId, next)
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveFields} />
      </Field>
      <Field label="Tags">
        <Input
          value={meta.tags.join(', ')}
          onChange={(e) =>
            setMeta({
              ...meta,
              tags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            })
          }
          onBlur={saveFields}
          placeholder="separate with ,"
        />
      </Field>
      <Field label="Content">
        <AutoGrowTextarea
          measureKey={nodeId}
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
          rows={3}
          className="font-serif text-base leading-relaxed"
        />
      </Field>
    </div>
  )
}
