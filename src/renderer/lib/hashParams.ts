import { useMemo, useState, useEffect } from 'react'

export function useSearchParams(): URLSearchParams {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHash = (): void => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return useMemo(() => {
    const raw = hash.replace(/^#/, '')
    return new URLSearchParams(raw.includes('=') ? raw : `child=${raw}`)
  }, [hash])
}

export function isDetachedPanelWindow(): boolean {
  const hash = window.location.hash
  return hash.includes('child=sidebar') || hash.includes('child=entity')
}

export function isWorkspaceWindow(): boolean {
  return window.location.hash.includes('child=workspace')
}

export function isChildWindow(): boolean {
  return window.location.hash.includes('child=')
}
