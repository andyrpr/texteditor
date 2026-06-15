import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

export function useThemeSync(): void {
  useEffect(() => {
    void window.electronAPI.tomes.getConfig().then((config) => {
      useAppStore.getState().setTheme(config.preferences.theme, { persist: false })
    })

    const unsub = window.electronAPI.on('theme:changed', (data: unknown) => {
      const { theme } = data as { theme: 'light' | 'dark' }
      useAppStore.getState().setTheme(theme, { persist: false })
    })

    return unsub
  }, [])
}
