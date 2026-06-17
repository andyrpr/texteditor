import { Label } from '@/components/UI/label'
import type { DevicePreviewRequestOptions, ManuscriptChapterRef } from '@shared/types'
import { cn } from '@/lib/utils'

interface ScopeSelectorProps {
  scope: DevicePreviewRequestOptions['scope']
  nodeId: string | null
  chapters: ManuscriptChapterRef[]
  onScopeChange: (scope: DevicePreviewRequestOptions['scope']) => void
  onNodeIdChange: (nodeId: string) => void
  className?: string
}

export function ScopeSelector({
  scope,
  nodeId,
  chapters,
  onScopeChange,
  onNodeIdChange,
  className
}: ScopeSelectorProps): React.JSX.Element {
  const hasChapters = chapters.length > 0

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Label className="sr-only">Scope</Label>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onScopeChange('manuscript')}
          className={cn(
            'no-drag rounded-md border px-2.5 py-1 text-xs transition-colors',
            scope === 'manuscript'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border hover:bg-accent/50'
          )}
        >
          Full manuscript
        </button>
        <button
          type="button"
          onClick={() => hasChapters && onScopeChange('chapter')}
          disabled={!hasChapters}
          className={cn(
            'no-drag rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50',
            scope === 'chapter'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border hover:bg-accent/50'
          )}
        >
          Chapter
        </button>
      </div>
      {scope === 'chapter' && hasChapters && (
        <select
          value={nodeId ?? chapters[0]?.id ?? ''}
          onChange={(e) => onNodeIdChange(e.target.value)}
          className="no-drag h-7 max-w-[220px] truncate rounded-md border border-border bg-background px-2 text-xs"
        >
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.pathLabel}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
