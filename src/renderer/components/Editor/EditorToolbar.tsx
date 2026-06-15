import { useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/UI/button'
import { Separator } from '@/components/UI/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/UI/tooltip'
import { StyleDropdown } from './StyleDropdown'
import { cn, countWords } from '@/lib/utils'
import type { BlockStyleType } from './BlockStyle'

interface EditorToolbarProps {
  editor: Editor | null
  wordCount: number
}

const STYLE_SHORTCUTS: { key: string; style: BlockStyleType }[] = [
  { key: '1', style: 'title' },
  { key: '2', style: 'heading1' },
  { key: '3', style: 'heading2' },
  { key: '4', style: 'heading3' },
  { key: '5', style: 'subheading' },
  { key: '6', style: 'body' },
  { key: '7', style: 'caption' },
  { key: '8', style: 'blockquote' },
  { key: '9', style: 'code' }
]

function ToolbarButton({
  onClick,
  isActive,
  tooltip,
  children
}: {
  onClick: () => void
  isActive?: boolean
  tooltip: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', isActive && 'bg-accent text-accent-foreground')}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export function EditorToolbar({ editor, wordCount }: EditorToolbarProps): React.JSX.Element {
  useEffect(() => {
    if (!editor) return

    const onKeyDown = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || !e.altKey || e.shiftKey) return
      const match = STYLE_SHORTCUTS.find((s) => s.key === e.key)
      if (!match) return
      e.preventDefault()
      editor.chain().focus().setBlockStyle(match.style).run()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor])

  if (!editor) return <div className="h-10 border-b border-border" />

  return (
    <TooltipProvider delayDuration={300}>
      <div className="no-drag flex items-center gap-0.5 border-b border-border px-3 py-1.5">
        <StyleDropdown editor={editor} />

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          tooltip="Bold (⌘B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          tooltip="Italic (⌘I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          tooltip="Underline (⌘U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          tooltip="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          tooltip="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          tooltip="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto text-xs text-muted-foreground">
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        </div>
      </div>
    </TooltipProvider>
  )
}

export { countWords }
