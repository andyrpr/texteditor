import { useEffect, useState } from 'react'
import { BookOpen, FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/UI/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/UI/dialog'
import { NewProjectModal } from '@/components/Project/NewProjectModal'
import { ProjectCard } from '@/components/Project/ProjectCard'
import { useProject } from '@/hooks/useProject'
import type { RecentProjectWithStatus } from '@shared/types'

import { useAppStore } from '@/store/appStore'

export function RecentProjectsScreen(): React.JSX.Element {
  const { openProject, openProjectAtPath, removeFromRecent, locateProject } = useProject()
  const { showNewProjectModal, setShowNewProjectModal } = useAppStore()
  const [recents, setRecents] = useState<RecentProjectWithStatus[]>([])
  const [missingProject, setMissingProject] = useState<RecentProjectWithStatus | null>(null)

  const loadRecents = async (): Promise<void> => {
    const projects = await window.electronAPI.tomes.getRecentProjects()
    setRecents(projects)
  }

  useEffect(() => {
    void loadRecents()
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.on('tomes:projectOpened', () => {
      void loadRecents()
    })
    return unsub
  }, [])

  const handleOpen = async (project: RecentProjectWithStatus): Promise<void> => {
    if (!project.exists) {
      setMissingProject(project)
      return
    }
    await openProjectAtPath(project.primaryPath)
  }

  const handleLocate = async (): Promise<void> => {
    if (!missingProject) return
    await locateProject(missingProject.id)
    setMissingProject(null)
    await loadRecents()
  }

  const handleRemoveMissing = async (): Promise<void> => {
    if (!missingProject) return
    await removeFromRecent(missingProject.id)
    setMissingProject(null)
    await loadRecents()
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Priama</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Local-first writing for authors. Your stories, your files, fully offline.
          </p>
        </div>

        <div className="mb-8 flex justify-center gap-3">
          <Button size="lg" onClick={() => setShowNewProjectModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button size="lg" variant="outline" onClick={openProject}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open Project
          </Button>
        </div>

        {recents.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Projects
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recents.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => handleOpen(project)}
                  onShowInFolder={() =>
                    window.electronAPI.tomes.showInFolder(project.primaryPath)
                  }
                  onRemove={async () => {
                    await removeFromRecent(project.id)
                    await loadRecents()
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {recents.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No recent projects yet. Create your first book project to get started.
          </p>
        )}
      </div>

      <NewProjectModal open={showNewProjectModal} onOpenChange={setShowNewProjectModal} />

      <Dialog open={!!missingProject} onOpenChange={() => setMissingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Not Found</DialogTitle>
            <DialogDescription>
              Project not found at {missingProject?.primaryPath}. It may have been moved or deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={handleRemoveMissing}>
              Remove from Recent
            </Button>
            <Button onClick={handleLocate}>Locate Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
