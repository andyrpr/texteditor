import { Extension } from '@tiptap/core'

export type BlockStyleType =
  | 'title'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'subheading'
  | 'body'
  | 'caption'
  | 'blockquote'
  | 'code'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockStyle: {
      setBlockStyle: (style: BlockStyleType) => ReturnType
    }
  }
}

export const BlockStyle = Extension.create({
  name: 'blockStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote'],
        attributes: {
          blockStyle: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-style'),
            renderHTML: (attributes) => {
              if (!attributes.blockStyle) return {}
              return { 'data-block-style': attributes.blockStyle }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setBlockStyle:
        (style: BlockStyleType) =>
        ({ chain, state }) => {
          const { $from } = state.selection
          const depth = $from.depth
          let blockDepth = depth
          while (blockDepth > 0 && !$from.node(blockDepth).isBlock) blockDepth--

          switch (style) {
            case 'title':
              return chain()
                .focus()
                .setHeading({ level: 1 })
                .updateAttributes('heading', { blockStyle: 'title' })
                .run()
            case 'heading1':
              return chain()
                .focus()
                .setHeading({ level: 1 })
                .updateAttributes('heading', { blockStyle: 'heading1' })
                .run()
            case 'heading2':
              return chain()
                .focus()
                .setHeading({ level: 2 })
                .updateAttributes('heading', { blockStyle: 'heading2' })
                .run()
            case 'heading3':
              return chain()
                .focus()
                .setHeading({ level: 3 })
                .updateAttributes('heading', { blockStyle: 'heading3' })
                .run()
            case 'subheading':
              return chain()
                .focus()
                .setHeading({ level: 4 })
                .updateAttributes('heading', { blockStyle: 'subheading' })
                .run()
            case 'body':
              return chain().focus().setParagraph().updateAttributes('paragraph', { blockStyle: 'body' }).run()
            case 'caption':
              return chain()
                .focus()
                .setParagraph()
                .updateAttributes('paragraph', { blockStyle: 'caption' })
                .run()
            case 'blockquote':
              return chain().focus().toggleBlockquote().run()
            case 'code':
              return chain().focus().toggleCodeBlock().run()
            default:
              return false
          }
        }
    }
  }
})

export function detectBlockStyle(editor: import('@tiptap/react').Editor): BlockStyleType {
  if (editor.isActive('codeBlock')) return 'code'
  if (editor.isActive('blockquote')) return 'blockquote'
  if (editor.isActive('heading', { level: 1 })) {
    const attrs = editor.getAttributes('heading')
    return attrs.blockStyle === 'title' ? 'title' : 'heading1'
  }
  if (editor.isActive('heading', { level: 2 })) return 'heading2'
  if (editor.isActive('heading', { level: 3 })) return 'heading3'
  if (editor.isActive('heading', { level: 4 })) return 'subheading'
  if (editor.isActive('paragraph')) {
    const attrs = editor.getAttributes('paragraph')
    if (attrs.blockStyle === 'caption') return 'caption'
  }
  return 'body'
}
