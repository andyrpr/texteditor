import { useSearchParams } from '@/lib/hashParams'
import { useThemeSync } from '@/hooks/useThemeSync'
import { toAssetUrl } from '@/lib/assetUrl'

export function ImageViewerRoot(): React.JSX.Element {
  const params = useSearchParams()
  const imagePath = params.get('imagePath') ?? ''
  const title = params.get('title') ?? 'Image'

  useThemeSync()

  const src = imagePath ? toAssetUrl(imagePath) : ''

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      {src ? (
        <img
          src={src}
          alt={title}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No image to display</p>
      )}
    </div>
  )
}
