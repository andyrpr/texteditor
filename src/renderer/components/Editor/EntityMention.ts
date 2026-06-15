import { Mark, mergeAttributes } from '@tiptap/core'

export interface EntityMentionOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    entityMention: {
      setEntityMention: (attrs: {
        entityId: string
        entityType: string
        entityName: string
      }) => ReturnType
      unsetEntityMention: () => ReturnType
    }
  }
}

export const EntityMention = Mark.create<EntityMentionOptions>({
  name: 'entityMention',

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      entityId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-id'),
        renderHTML: (attributes) => ({
          'data-entity-id': attributes.entityId
        })
      },
      entityType: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-type'),
        renderHTML: (attributes) => ({
          'data-entity-type': attributes.entityType
        })
      },
      entityName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-name'),
        renderHTML: (attributes) => ({
          'data-entity-name': attributes.entityName
        })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-entity-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'entity-mention'
      }),
      0
    ]
  },

  addCommands() {
    return {
      setEntityMention:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs)
        },
      unsetEntityMention:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        }
    }
  }
})
