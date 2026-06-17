import { FileText, Files } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/UI/dialog'
import { cn } from '@/lib/utils'
import type { ChapterStructure } from '@shared/types'

interface ChapterStructureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (structure: ChapterStructure) => void
}

export function ChapterStructureModal({
  open,
  onOpenChange,
  onSelect
}: ChapterStructureModalProps): React.JSX.Element {
  const options = [
    {
      id: 'simple' as const,
      icon: FileText,
      title: 'Simple Chapter',
      description: 'One continuous document. Best for linear writers and short chapters.'
    },
    {
      id: 'scenes' as const,
      icon: Files,
      title: 'Chapter with Scenes',
      description: 'A chapter folder containing multiple scene documents. Best for beats and POV shifts.'
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="no-drag sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chapter Structure</DialogTitle>
          <DialogDescription>Choose how this chapter is organized before creating it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={cn(
                  'no-drag flex gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/50'
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{opt.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
