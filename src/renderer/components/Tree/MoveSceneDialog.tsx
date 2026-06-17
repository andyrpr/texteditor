import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/UI/dialog'
import { Button } from '@/components/UI/button'
import type { TreeNode } from '@shared/types'

interface MoveSceneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chapters: TreeNode[]
  onMove: (chapterId: string) => void | Promise<void>
}

export function MoveSceneDialog({
  open,
  onOpenChange,
  chapters,
  onMove
}: MoveSceneDialogProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(chapters[0]?.id ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move scene to chapter</DialogTitle>
          <DialogDescription>Select a chapter with scenes as the destination.</DialogDescription>
        </DialogHeader>
        <div className="max-h-60 space-y-1 overflow-y-auto py-2">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => setSelectedId(chapter.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedId === chapter.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
            >
              {chapter.title}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) {
                void Promise.resolve(onMove(selectedId)).finally(() => onOpenChange(false))
              }
            }}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
