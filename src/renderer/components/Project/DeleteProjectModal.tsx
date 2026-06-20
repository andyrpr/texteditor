import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/UI/dialog'
import { Input } from '@/components/UI/input'
import { Button } from '@/components/UI/button'
import type { RecentProjectWithStatus } from '@shared/types'

const COUNTDOWN_SECONDS = 4

interface DeleteProjectModalProps {
  project: RecentProjectWithStatus | null
  onClose: () => void
  onConfirm: (project: RecentProjectWithStatus) => Promise<void>
}

export function DeleteProjectModal({
  project,
  onClose,
  onConfirm
}: DeleteProjectModalProps): React.JSX.Element {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!project) return
    setCountdown(COUNTDOWN_SECONDS)
    setConfirmText('')
    setDeleting(false)

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [project?.id])

  const canConfirm =
    countdown === 0 && confirmText.trim() === project?.title?.trim() && !deleting

  const handleConfirm = async (): Promise<void> => {
    if (!project || !canConfirm) return
    setDeleting(true)
    try {
      await onConfirm(project)
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean): void => {
    if (!open && !deleting) onClose()
  }

  return (
    <Dialog open={!!project} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Project</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p>
                This will <strong>permanently delete</strong> all project files from the primary
                location on your computer. This cannot be undone.
              </p>
              <p className="text-sm">
                <strong>Backup copies</strong> saved to other locations are not affected.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {countdown > 0 && (
            <p className="text-sm text-muted-foreground">
              Please read the warning above. You can confirm in{' '}
              <span className="font-medium tabular-nums text-foreground">{countdown}s</span>…
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              Type <span className="font-medium text-foreground">&ldquo;{project?.title}&rdquo;</span>{' '}
              to confirm:
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleConfirm()
              }}
              placeholder={project?.title ?? ''}
              disabled={deleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm}
          >
            {deleting ? 'Deleting…' : 'Delete Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
