import { useEffect, useRef, useCallback } from 'react'

export function useResizeHandle(
  width: number,
  onWidthChange: (w: number) => void,
  min: number,
  max: number,
  side: 'left' | 'right' = 'left'
): {
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    className: string
  }
} {
  const dragging = useRef(false)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      const startX = e.clientX
      const startWidth = width

      const onMove = (ev: MouseEvent): void => {
        if (!dragging.current) return
        const delta = ev.clientX - startX
        const next = side === 'left' ? startWidth + delta : startWidth - delta
        onWidthChange(Math.min(max, Math.max(min, next)))
      }

      const onUp = (): void => {
        dragging.current = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [width, onWidthChange, min, max, side]
  )

  return {
    handleProps: {
      onMouseDown,
      className:
        'absolute top-0 z-10 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors'
    }
  }
}

export function usePersistLayout(width: number, key: 'sidebarWidth' | 'rightPanelWidth'): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      void window.electronAPI.windows.updateLayout({ [key]: width })
    }, 300)
    return () => clearTimeout(timer)
  }, [width, key])
}
