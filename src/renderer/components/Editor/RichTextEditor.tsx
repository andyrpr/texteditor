import { useCallback, useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { EntityMention } from './EntityMention'
import { BlockStyle } from './BlockStyle'
import { EditorToolbar } from './EditorToolbar'
import { useAppStore } from '@/store/appStore'
import { useAutosave, useKeyboardSave } from '@/hooks/useAutosave'
import { countWords } from '@/lib/utils'
import type { TreeNode, ChapterMeta } from '@shared/types'
import {
  DEFAULT_CHARACTER_META,
  DEFAULT_LOCATION_META,
  DEFAULT_LORE_META,
  DEFAULT_CHAPTER_META,
  parseMetadata
} from '@shared/types'
import type { CharacterMeta, LocationMeta, LoreMeta } from '@shared/types'

interface RichTextEditorProps {
  node: TreeNode | null
}

function isSimpleChapter(node: TreeNode): boolean {
  const meta = parseMetadata<ChapterMeta>(node.metadata, DEFAULT_CHAPTER_META)
  return meta.structure === 'simple'
}

function isChapterFolder(node: TreeNode): boolean {
  if (node.type !== 'chapter') return false
  const meta = parseMetadata<ChapterMeta>(node.metadata, DEFAULT_CHAPTER_META)
  return meta.structure === 'scenes'
}

function buildEntityNames(nodes: TreeNode[]): Map<string, { id: string; type: string; name: string }> {
  const map = new Map<string, { id: string; type: string; name: string }>()

  for (const node of nodes) {
    if (node.type === 'character') {
      map.set(node.title.toLowerCase(), { id: node.id, type: 'character', name: node.title })
      const meta = parseMetadata<CharacterMeta>(node.metadata, DEFAULT_CHARACTER_META)
      for (const alias of meta.aliases) {
        if (alias) map.set(alias.toLowerCase(), { id: node.id, type: 'character', name: node.title })
      }
    } else if (node.type === 'location') {
      map.set(node.title.toLowerCase(), { id: node.id, type: 'location', name: node.title })
    } else if (node.type === 'lore') {
      map.set(node.title.toLowerCase(), { id: node.id, type: 'lore', name: node.title })
    }
  }

  return map
}

export function RichTextEditor({ node }: RichTextEditorProps): React.JSX.Element {
  const {
    nodes,
    setDirty,
    updateNodeInStore,
    setLastSaved,
    setSelectedEntity
  } = useAppStore()

  const entityMap = useMemo(() => buildEntityNames(nodes), [nodes])
  const isEditable =
    node &&
    (node.type === 'scene' || (node.type === 'chapter' && isSimpleChapter(node)))

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] }
      }),
      Underline,
      BlockStyle,
      EntityMention,
      Placeholder.configure({
        placeholder: 'Start writing...'
      }),
      CharacterCount
    ],
    content: node?.content ?? '',
    editable: !!isEditable,
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-full',
        role: 'textbox',
        'aria-autocomplete': 'none',
        autocomplete: 'off',
        autocorrect: 'on',
        autocapitalize: 'sentences',
        spellcheck: 'true',
        'data-form-type': 'other',
        'data-lpignore': 'true',
        'data-1p-ignore': 'true'
      },
      handleClickOn: (_view, _pos, nodeEl) => {
        if (nodeEl.type.name === 'text') {
          const marks = nodeEl.marks
          const mention = marks.find((m) => m.type.name === 'entityMention')
          if (mention) {
            setSelectedEntity(
              mention.attrs.entityId as string,
              mention.attrs.entityType as 'character' | 'location' | 'lore'
            )
            return true
          }
        }
        return false
      }
    },
    onUpdate: ({ editor: ed }) => {
      if (!node) return
      setDirty(true)
      updateNodeInStore(node.id, { content: ed.getHTML() })
    }
  }, [node?.id])

  useEffect(() => {
    if (editor && node) {
      const current = editor.getHTML()
      if (current !== node.content) {
        editor.commands.setContent(node.content, false)
      }
      editor.setEditable(!!isEditable)
    }
  }, [editor, node?.id, node?.content, isEditable])

  const content = node?.content ?? ''
  useAutosave(content, node?.id ?? null)

  const handleSave = useCallback(async () => {
    if (!node) return
    try {
      await window.electronAPI.tree.update(node.id, { content: editor?.getHTML() ?? content })
      const result = await window.electronAPI.tomes.saveProject()
      if (result.success) setLastSaved(result.lastSaved)
    } catch (err) {
      console.error('Save failed:', err)
    }
  }, [node, editor, content, setLastSaved])

  useKeyboardSave(handleSave)

  const wordCount = editor ? countWords(editor.getHTML()) : 0

  if (!node) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a chapter or scene to start writing</p>
      </div>
    )
  }

  if (node && isChapterFolder(node)) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a scene in this chapter to start writing</p>
      </div>
    )
  }

  if (!isEditable) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <p className="text-sm">Entity details are shown in the right panel</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <EditorToolbar editor={editor} wordCount={wordCount} />
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <EditorContent editor={editor} className="font-serif text-lg leading-relaxed" />
        </div>
      </div>
    </div>
  )
}
