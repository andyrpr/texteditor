import { Moon, Sun, Download, Save } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/UI/button'
import { formatRelativeTime } from '@/lib/utils'

export function StatusBar(): React.JSX.Element {
  const { lastSaved, isDirty, theme, toggleTheme, projectMeta } = useAppStore()

  const handleSave = async () => {
    const result = await window.electronAPI.project.save()
    if (result.success) {
      useAppStore.getState().setLastSaved(result.lastSaved)
    }
  }

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-muted/30 px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {isDirty ? (
          <span>Unsaved changes</span>
        ) : lastSaved ? (
          <span>Saved {formatRelativeTime(lastSaved)}</span>
        ) : (
          <span>Ready</span>
        )}
        {projectMeta && (
          <>
            <span className="text-border">|</span>
            <span>{projectMeta.title}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave} title="Save">
          <Save className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="Export">
          <Download className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        </Button>
      </div>
    </footer>
  )
}
