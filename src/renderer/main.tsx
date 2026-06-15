import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppLayout } from './App'
import { ChildWindowRoot } from './ChildWindowRoot'
import { isDetachedPanelWindow } from './lib/hashParams'
import './index.css'

const Root = isDetachedPanelWindow() ? ChildWindowRoot : AppLayout

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
