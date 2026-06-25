import { useState } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Camera, ChevronRight, Plus, Star, Trash2 } from 'lucide-react'
import { toAssetUrl } from '@/lib/assetUrl'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/UI/ConfirmDialog'
import { MAX_ENTITY_GALLERY_IMAGES } from '@shared/types'

type EntityImageType = 'character' | 'location' | 'lore' | 'entry'

type EntityImages = {
  imagePath: string | null
  secondaryImagePaths: string[]
}

type PendingDelete =
  | { kind: 'primary' }
  | { kind: 'gallery'; index: number }
  | null

const menuContentClass =
  'z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md'
const menuItemClass =
  'flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent'
const menuItemDestructiveClass = `${menuItemClass} text-destructive`

function ImageContextMenu({
  children,
  onDelete,
  onSetPrimary
}: {
  children: React.ReactNode
  onDelete: () => void
  onSetPrimary?: () => void
}): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass}>
          {onSetPrimary && (
            <ContextMenu.Item className={menuItemClass} onSelect={onSetPrimary}>
              <Star className="mr-2 h-3.5 w-3.5" />
              Set as primary
            </ContextMenu.Item>
          )}
          {onSetPrimary && <ContextMenu.Separator className="my-1 h-px bg-border" />}
          <ContextMenu.Item className={menuItemDestructiveClass} onSelect={onDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

export function EntityImageBanner({
  nodeId,
  title,
  imagePath,
  secondaryImagePaths,
  entityType,
  onImagesChange
}: {
  nodeId: string
  title: string
  imagePath: string | null
  secondaryImagePaths: string[]
  entityType: EntityImageType
  onImagesChange: (next: EntityImages) => void
}): React.JSX.Element {
  const [galleryExpanded, setGalleryExpanded] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)

  const entityLabel =
    entityType === 'character'
      ? 'character'
      : entityType === 'location'
        ? 'location'
        : entityType === 'lore'
          ? 'lore'
          : 'person'

  const atGalleryLimit = secondaryImagePaths.length >= MAX_ENTITY_GALLERY_IMAGES
  const primaryImageUrl = imagePath ? toAssetUrl(imagePath) : null

  const openViewer = async (path: string): Promise<void> => {
    await window.electronAPI.windows.openImageViewer(path, title)
  }

  const uploadPrimary = async (): Promise<void> => {
    const sourcePath = await window.electronAPI.dialog.selectImage()
    if (!sourcePath) return

    const { relativePath } = await window.electronAPI.entity.importEntityImage(
      nodeId,
      sourcePath,
      entityType
    )
    onImagesChange({ imagePath: relativePath, secondaryImagePaths })
  }

  const addGalleryImage = async (): Promise<void> => {
    if (atGalleryLimit) return

    const sourcePath = await window.electronAPI.dialog.selectImage()
    if (!sourcePath) return

    const { relativePath } = await window.electronAPI.entity.importEntityGalleryImage(
      nodeId,
      sourcePath,
      entityType
    )
    onImagesChange({
      imagePath,
      secondaryImagePaths: [...secondaryImagePaths, relativePath]
    })
  }

  const promoteGalleryImage = (index: number): void => {
    const promoted = secondaryImagePaths[index]
    if (!promoted) return

    const nextGallery = [...secondaryImagePaths]
    if (imagePath) {
      nextGallery[index] = imagePath
    } else {
      nextGallery.splice(index, 1)
    }
    onImagesChange({ imagePath: promoted, secondaryImagePaths: nextGallery })
  }

  const confirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return

    if (pendingDelete.kind === 'primary' && imagePath) {
      await window.electronAPI.entity.deleteEntityImage(imagePath)
      onImagesChange({ imagePath: null, secondaryImagePaths })
    } else if (pendingDelete.kind === 'gallery') {
      const path = secondaryImagePaths[pendingDelete.index]
      if (path) {
        await window.electronAPI.entity.deleteEntityImage(path)
        onImagesChange({
          imagePath,
          secondaryImagePaths: secondaryImagePaths.filter((_, i) => i !== pendingDelete.index)
        })
      }
    }
  }

  const bannerClass = cn(
    '-mx-4 -mt-4 block aspect-[4/3] w-[calc(100%+2rem)] overflow-hidden bg-muted/20 transition-colors',
    imagePath
      ? 'cursor-pointer hover:opacity-95'
      : 'border border-dashed border-input hover:bg-muted/30'
  )

  const primaryBanner = imagePath ? (
    <ImageContextMenu onDelete={() => setPendingDelete({ kind: 'primary' })}>
      <div className={bannerClass}>
        <button
          type="button"
          onClick={() => void openViewer(imagePath)}
          className="block h-full w-full"
          title="Open image in new window"
        >
          <img
            src={primaryImageUrl!}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </button>
      </div>
    </ImageContextMenu>
  ) : (
    <div className={bannerClass}>
      <button
        type="button"
        onClick={() => void uploadPrimary()}
        className="flex h-full w-full items-center justify-center text-muted-foreground"
        title={`Upload ${entityLabel} image`}
      >
        <Camera className="h-5 w-5" />
      </button>
    </div>
  )

  const galleryCountLabel =
    secondaryImagePaths.length > 0 ? ` (${secondaryImagePaths.length})` : ''

  return (
    <div className="mb-4">
      {primaryBanner}

      <div className="mb-2 mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setGalleryExpanded((open) => !open)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
              galleryExpanded && 'rotate-90'
            )}
          />
          <span className="truncate">
            More Images
            {galleryCountLabel}
          </span>
        </button>
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          disabled={atGalleryLimit}
          title={atGalleryLimit ? 'Gallery limit reached' : 'Add image'}
          onClick={() => void addGalleryImage()}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          galleryExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              'grid max-h-72 grid-cols-3 gap-1 overflow-y-auto pt-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
              galleryExpanded
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-1 opacity-0'
            )}
          >
            {secondaryImagePaths.map((path, index) => (
              <ImageContextMenu
                key={path}
                onSetPrimary={() => promoteGalleryImage(index)}
                onDelete={() => setPendingDelete({ kind: 'gallery', index })}
              >
                <div className="aspect-square overflow-hidden rounded-sm bg-muted/20">
                  <button
                    type="button"
                    onClick={() => void openViewer(path)}
                    className="block h-full w-full hover:opacity-95"
                    title="Open image in new window"
                  >
                    <img
                      src={toAssetUrl(path)}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                </div>
              </ImageContextMenu>
            ))}
            {!atGalleryLimit && (
              <button
                type="button"
                onClick={() => void addGalleryImage()}
                className="flex aspect-square items-center justify-center rounded-sm border border-dashed border-input bg-muted/20 text-muted-foreground hover:bg-muted/30"
                title="Add image"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete image?"
        description="This image will be permanently removed from the project."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  )
}
