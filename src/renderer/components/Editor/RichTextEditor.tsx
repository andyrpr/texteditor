import { useEffect, useMemo, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { EntityMention } from './EntityMention'
import { BlockStyle } from './BlockStyle'
import { EditorToolbar } from './EditorToolbar'
import { SearchBar } from './SearchBar'
import SearchAndReplace from './searchAndReplace'
import { SpellCheckExtension } from '@/extensions/SpellCheckExtension'
import { SpellSuggestions } from './SpellSuggestions'
import { addCustomWord, removeCustomWord, isCustomWord } from '@/lib/spellCheck'
import { useAppStore } from '@/store/appStore'
import { markContentDirty, registerActiveEditor } from '@/lib/contentPersistence'
import { countWords } from '@/lib/utils'
import { isSimpleChapter } from '@/lib/treeUtils'
import { findCategory, categoryOpensInMainEditor } from '@shared/categoryView'
import type { TreeNode } from '@shared/types'

import {
  DEFAULT_CHARACTER_META,
  DEFAULT_LOCATION_META,
  DEFAULT_LORE_META,
  parseMetadata
} from '@shared/types'
import type { CharacterMeta, LocationMeta, LoreMeta } from '@shared/types'

interface RichTextEditorProps {
  node: TreeNode | null
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
  const { nodes, categories, updateNodeInStore, setSelectedEntity } = useAppStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchOpenWithReplace, setSearchOpenWithReplace] = useState(false)
  const [searchFocusKey, setSearchFocusKey] = useState(0)
  const [spellMenu, setSpellMenu] = useState<{
    x: number
    y: number
    word: string
    suggestions: string[]
    message?: string
    from: number
    to: number
  } | null>(null)

  const entityMap = useMemo(() => buildEntityNames(nodes), [nodes])
  const isEditable =
    node &&
    (node.type === 'scene' ||
      (node.type === 'chapter' && isSimpleChapter(node)) ||
      (node.type === 'entry' &&
        categoryOpensInMainEditor(findCategory(categories, node.categoryId))))

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
      CharacterCount,
      SearchAndReplace.configure({
        searchResultClass: 'search-result',
        disableRegex: true
      }),
      SpellCheckExtension
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
        spellcheck: 'false',
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
      const html = ed.getHTML()
      updateNodeInStore(node.id, { content: html })
      markContentDirty(node.id, html)
    }
  }, [node?.id])

  useEffect(() => {
    if (!editor || !node) {
      registerActiveEditor(null)
      return
    }

    registerActiveEditor(() => ({ nodeId: node.id, content: editor.getHTML() }))

    return () => registerActiveEditor(null)
  }, [editor, node?.id, node])

  useEffect(() => {
    if (editor && node) {
      editor.commands.setContent(node.content, false)
    }
  }, [editor, node?.id])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!!isEditable)
    }
  }, [editor, isEditable])

  useEffect(() => {
    setSearchOpen(false)
  }, [node?.id])

  useEffect(() => {
    if (!editor) return

    const handler = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      if (e.key === 'f') {
        e.preventDefault()
        if (searchOpen) {
          setSearchFocusKey((k) => k + 1)
        } else {
          setSearchOpenWithReplace(false)
          setSearchOpen(true)
        }
      }
      if (e.key === 'h') {
        e.preventDefault()
        if (searchOpen) {
          setSearchOpenWithReplace(true)
          setSearchFocusKey((k) => k + 1)
        } else {
          setSearchOpenWithReplace(true)
          setSearchOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor, searchOpen])

  const handleCloseSearch = (): void => {
    setSearchOpen(false)
    if (editor) {
      editor.commands.setSearchTerm('')
      editor.commands.setReplaceTerm('')
      editor.commands.focus()
    }
  }

  const handleOpenSearch = (): void => {
    if (searchOpen) {
      setSearchFocusKey((k) => k + 1)
    } else {
      setSearchOpenWithReplace(false)
      setSearchOpen(true)
    }
  }

  const wordCount = editor ? countWords(editor.getHTML()) : 0

  if (!node) {
    return (
      <div className="no-drag flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a chapter or scene to start writing</p>
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
    <div
      className="no-drag flex flex-1 flex-col overflow-hidden"
      onContextMenu={(e) => {
        const target = e.target as HTMLElement
        const spellEl = target.closest('.spell-error') as HTMLElement | null
        if (!spellEl) return

        e.preventDefault()

        const word = spellEl.dataset.word ?? ''
        const suggestions: string[] = JSON.parse(spellEl.dataset.suggestions ?? '[]')
        const message = spellEl.dataset.message || undefined

        if (!editor) return
        try {
          const view = editor.view
          const domPos = view.posAtDOM(spellEl, 0)
          if (domPos === null) return

          setSpellMenu({
            x: e.clientX,
            y: e.clientY,
            word,
            suggestions,
            message,
            from: domPos,
            to: domPos + word.length
          })
        } catch {
          return
        }
      }}
    >
      <EditorToolbar editor={editor} wordCount={wordCount} onOpenSearch={handleOpenSearch} />
      {searchOpen && editor && (
        <SearchBar
          key={searchOpenWithReplace ? 'replace' : 'search'}
          editor={editor}
          onClose={handleCloseSearch}
          defaultShowReplace={searchOpenWithReplace}
          focusKey={searchFocusKey}
        />
      )}
      <div className="editor-scroll flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <EditorContent editor={editor} className="font-serif text-lg leading-relaxed" />
        </div>
      </div>

      {spellMenu && (
        <SpellSuggestions
          x={spellMenu.x}
          y={spellMenu.y}
          word={spellMenu.word}
          suggestions={spellMenu.suggestions}
          message={spellMenu.message}
          isCustomWord={isCustomWord(spellMenu.word)}
          onSelect={(replacement) => {
            if (!editor) return
            editor.commands.removeSpellDecoration(spellMenu.from, spellMenu.to)
            editor
              .chain()
              .focus()
              .setTextSelection({ from: spellMenu.from, to: spellMenu.to })
              .insertContent(replacement)
              .run()
            setSpellMenu(null)
          }}
          onAddToDictionary={() => {
            addCustomWord(spellMenu.word)
            editor?.commands.removeSpellDecoration(spellMenu.from, spellMenu.to)
            setSpellMenu(null)
          }}
          onRemoveFromDictionary={() => {
            removeCustomWord(spellMenu.word)
            setSpellMenu(null)
            editor?.commands.refreshSpellCheck()
          }}
          onClose={() => setSpellMenu(null)}
        />
      )}
    </div>
  )
}
