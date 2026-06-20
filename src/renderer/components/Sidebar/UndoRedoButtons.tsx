import { Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/components/UI/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/UI/tooltip'
import { useHistoryStore } from '@/store/historyStore'
import { cn } from '@/lib/utils'

export function UndoRedoButtons({ className }: { className?: string }): React.JSX.Element {
  const { undo, redo, canUndo, canRedo } = useHistoryStore()

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex shrink-0 items-center gap-0.5', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canUndo}
              onClick={() => void undo()}
              aria-label="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canRedo}
              onClick={() => void redo()}
              aria-label="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
