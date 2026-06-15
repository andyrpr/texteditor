import { useState } from 'react'
import { BookOpen, FolderOpen } from 'lucide-react'
import { Button } from '@/components/UI/button'
import { Input } from '@/components/UI/input'
import { useProject } from '@/hooks/useProject'

export function WelcomeScreen(): React.JSX.Element {
  const { createProject, openProject } = useProject()
  const [showNewForm, setShowNewForm] = useState(false)
  const [title, setTitle] = useState('My Book Project')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      await createProject(title.trim(), author.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-6 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">TextEditor</h1>
          <p className="text-sm text-muted-foreground">
            A local-first writing app for authors. Your stories, your files, fully offline.
          </p>
        </div>

        {!showNewForm ? (
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={() => setShowNewForm(true)} className="w-full">
              <BookOpen className="mr-2 h-4 w-4" />
              New Book Project
            </Button>
            <Button size="lg" variant="outline" onClick={openProject} className="w-full">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Existing Project
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-left">
            <h2 className="text-lg font-medium">New Book Project</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Project Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Novel"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Author Name
                </label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={loading || !title.trim()} className="flex-1">
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
              <Button variant="ghost" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Projects are saved as portable .db files — store them anywhere, including iCloud or Google Drive.
        </p>
      </div>
    </div>
  )
}
