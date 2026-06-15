import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { detectBlockStyle, type BlockStyleType } from './BlockStyle'
import { cn } from '@/lib/utils'

const STYLES: { id: BlockStyleType; label: string; previewClass: string }[] = [
  { id: 'title', label: 'Title', previewClass: 'text-lg font-bold' },
  { id: 'heading1', label: 'Heading 1', previewClass: 'text-base font-bold' },
  { id: 'heading2', label: 'Heading 2', previewClass: 'text-sm font-semibold' },
  { id: 'heading3', label: 'Heading 3', previewClass: 'text-sm font-medium' },
  { id: 'subheading', label: 'Subheading', previewClass: 'text-sm font-medium italic text-muted-foreground' },
  { id: 'body', label: 'Body Text', previewClass: 'text-sm' },
  { id: 'caption', label: 'Caption', previewClass: 'text-xs text-muted-foreground' },
  { id: 'blockquote', label: 'Block Quote', previewClass: 'text-sm italic text-muted-foreground' },
  { id: 'code', label: 'Code Block', previewClass: 'font-mono text-xs' }
]

const LABELS: Record<BlockStyleType, string> = Object.fromEntries(
  STYLES.map((s) => [s.id, s.label])
) as Record<BlockStyleType, string>

interface StyleDropdownProps {
  editor: Editor | null
}

export function StyleDropdown({ editor }: StyleDropdownProps): React.JSX.Element | null {
  const [current, setCurrent] = useState<BlockStyleType>('body')

  useEffect(() => {
    if (!editor) return
    const update = (): void => setCurrent(detectBlockStyle(editor))
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    update()
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  if (!editor) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex h-8 items-center gap-1 rounded-md px-2 text-sm hover:bg-accent">
        <span className="max-w-[120px] truncate">{LABELS[current]}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[200px] rounded-md border border-border bg-popover p-1 shadow-md"
          align="start"
        >
          {STYLES.map((style) => (
            <DropdownMenu.Item
              key={style.id}
              className={cn(
                'flex cursor-pointer items-center rounded-sm px-2 py-1.5 outline-none hover:bg-accent',
                style.previewClass,
                current === style.id && 'bg-accent'
              )}
              onSelect={() => editor.chain().focus().setBlockStyle(style.id).run()}
            >
              {style.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
