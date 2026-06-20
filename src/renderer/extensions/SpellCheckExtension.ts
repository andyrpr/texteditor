import { Extension } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { check } from '@/lib/spellCheck'

const DEBOUNCE_MS = 800
const BLOCK_SEP = '\n'
const LEAF_TEXT = '\u200b'

export const spellCheckPluginKey = new PluginKey<DecorationSet>('spellCheck')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spellCheck: {
      refreshSpellCheck: () => ReturnType
    }
  }
}

function buildTextAndPosMap(doc: PMNode): { text: string; posMap: number[] } {
  const posMap: number[] = []
  let text = ''
  let separated = true

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isText) {
      const nodeText = node.text!
      const len = nodeText.length
      const start = text.length
      for (let i = 0; i < len; i++) {
        posMap[start + i] = pos + i
      }
      text += nodeText
      separated = false
    } else if (node.isLeaf) {
      posMap[text.length] = pos
      text += LEAF_TEXT
      separated = false
    } else if (!separated && node.isBlock) {
      posMap[text.length] = pos
      text += BLOCK_SEP
      separated = true
    }
  })

  return { text, posMap }
}

function requestIdle(callback: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: 500 })
  } else {
    setTimeout(callback, 0)
  }
}

export const SpellCheckExtension = Extension.create({
  name: 'spellCheck',

  addCommands() {
    return {
      refreshSpellCheck:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(spellCheckPluginKey, 'recheck'))
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let needsRecheck = false
    let generation = 0
    let abortController: AbortController | null = null

    return [
      new Plugin({
        key: spellCheckPluginKey,

        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, old) {
            if (tr.getMeta(spellCheckPluginKey) === 'recheck') {
              needsRecheck = true
              return old
            }
            if (tr.docChanged) {
              return old.map(tr.mapping, tr.doc)
            }
            const newDecs = tr.getMeta(spellCheckPluginKey)
            if (newDecs !== undefined) return newDecs
            return old
          }
        },

        props: {
          decorations(state) {
            return spellCheckPluginKey.getState(state)
          }
        },

        view(editorView) {
          const scheduleCheck = (): void => {
            if (debounceTimer) clearTimeout(debounceTimer)
            generation++
            const myGen = generation
            abortController?.abort()
            abortController = new AbortController()
            const signal = abortController.signal

            debounceTimer = setTimeout(async () => {
              const { doc } = editorView.state
              const { text, posMap } = buildTextAndPosMap(doc)
              const matches = await check(text, { signal })

              if (myGen !== generation || editorView.isDestroyed || signal.aborted) return

              const decorations: Decoration[] = []

              for (const match of matches) {
                const from = posMap[match.from]
                const to = posMap[match.to - 1]
                if (from === undefined || to === undefined) continue

                decorations.push(
                  Decoration.inline(from, to + 1, {
                    class: 'spell-error',
                    'data-word': match.word,
                    'data-suggestions': JSON.stringify(match.suggestions),
                    'data-message': match.message ?? ''
                  })
                )
              }

              if (myGen !== generation || editorView.isDestroyed) return

              const currentDoc = editorView.state.doc
              const newDecorationSet = DecorationSet.create(currentDoc, decorations)
              const tr = editorView.state.tr.setMeta(spellCheckPluginKey, newDecorationSet)
              editorView.dispatch(tr)
            }, DEBOUNCE_MS)
          }

          requestIdle(() => scheduleCheck())

          return {
            update(view, prevState) {
              if (view.state.doc !== prevState.doc || needsRecheck) {
                needsRecheck = false
                scheduleCheck()
              }
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer)
              abortController?.abort()
            }
          }
        }
      })
    ]
  }
})
