import { Camera } from 'lucide-react'
import { toAssetUrl } from '@/lib/assetUrl'
import { cn } from '@/lib/utils'

type EntityImageType = 'character' | 'location'

export function EntityImageBanner({
  nodeId,
  title,
  imagePath,
  entityType,
  onImageChange
}: {
  nodeId: string
  title: string
  imagePath: string | null
  entityType: EntityImageType
  onImageChange: (imagePath: string | null) => void
}): React.JSX.Element {
  const entityLabel = entityType === 'character' ? 'character' : 'location'

  const handleClick = async (): Promise<void> => {
    if (imagePath) {
      await window.electronAPI.windows.openImageViewer(imagePath, title)
      return
    }

    const sourcePath = await window.electronAPI.dialog.selectImage()
    if (!sourcePath) return

    const { relativePath } = await window.electronAPI.entity.importEntityImage(
      nodeId,
      sourcePath,
      entityType
    )
    onImageChange(relativePath)
  }

  const imageUrl = imagePath ? toAssetUrl(imagePath) : null

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={cn(
        '-mx-4 -mt-4 mb-4 block aspect-[16/4] w-[calc(100%+2rem)] overflow-hidden bg-muted/20 transition-colors',
        imagePath
          ? 'cursor-pointer hover:opacity-95'
          : 'cursor-pointer border border-dashed border-input hover:bg-muted/30'
      )}
      title={imagePath ? 'Open image in new window' : `Upload ${entityLabel} image`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Camera className="h-5 w-5" />
        </span>
      )}
    </button>
  )
}
