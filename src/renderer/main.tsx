import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppLayout } from './App'
import { ChildWindowRoot } from './ChildWindowRoot'
import { ImageViewerRoot } from './ImageViewerRoot'
import { isDetachedPanelWindow, isImageViewerWindow } from './lib/hashParams'
import './index.css'

function Root(): React.JSX.Element {
  if (isImageViewerWindow()) return <ImageViewerRoot />
  if (isDetachedPanelWindow()) return <ChildWindowRoot />
  return <AppLayout />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
