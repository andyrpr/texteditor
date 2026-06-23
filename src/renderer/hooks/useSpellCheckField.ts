import { useCallback, useEffect, useRef, useState } from 'react'
import { addCustomWord, check, type SpellMatch } from '@/lib/spellCheck'

const DEBOUNCE_MS = 300

export interface SpellCheckMenuState {
  x: number
  y: number
  match: SpellMatch
}

export function useSpellCheckField(
  value: string,
  options?: { enabled?: boolean; debounceMs?: number }
): {
  matches: SpellMatch[]
  menu: SpellCheckMenuState | null
  closeMenu: () => void
  onFocus: () => void
  onBlur: () => void
  markDirty: () => void
  handleContextMenu: (
    e: React.MouseEvent,
    input: HTMLInputElement | HTMLTextAreaElement
  ) => void
  applySuggestion: (replacement: string) => string | null
  addToDictionary: () => void
} {
  const enabled = options?.enabled !== false
  const debounceMs = options?.debounceMs ?? DEBOUNCE_MS

  const [matches, setMatches] = useState<SpellMatch[]>([])
  const [menu, setMenu] = useState<SpellCheckMenuState | null>(null)
  const [focused, setFocused] = useState(false)
  const [dirty, setDirty] = useState(false)

  const generationRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runCheck = useCallback(
    async (text: string, gen: number) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const result = await check(text, { signal: controller.signal })
      if (gen !== generationRef.current || controller.signal.aborted) return
      setMatches(result)
    },
    []
  )

  const scheduleCheck = useCallback(
    (text: string) => {
      if (!enabled) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      generationRef.current++
      const gen = generationRef.current

      debounceRef.current = setTimeout(() => {
        void runCheck(text, gen)
      }, debounceMs)
    },
    [enabled, debounceMs, runCheck]
  )

  useEffect(() => {
    if (!enabled) {
      setMatches([])
      return
    }
    if (!focused && !dirty) return
    scheduleCheck(value)
  }, [value, focused, dirty, enabled, scheduleCheck])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const onFocus = useCallback(() => {
    setFocused(true)
  }, [])

  const onBlur = useCallback(() => {
    setFocused(false)
    setMenu(null)
  }, [])

  const markDirty = useCallback(() => {
    setDirty(true)
  }, [])

  const closeMenu = useCallback(() => {
    setMenu(null)
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, input: HTMLInputElement | HTMLTextAreaElement) => {
      if (!enabled) return

      const offset = input.selectionStart ?? 0
      const match = matches.find((m) => offset >= m.from && offset < m.to)
      if (!match) return

      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY, match })
    },
    [enabled, matches]
  )

  const applySuggestion = useCallback(
    (replacement: string): string | null => {
      if (!menu) return null
      const { from, to } = menu.match
      const next = value.slice(0, from) + replacement + value.slice(to)
      setMenu(null)
      setDirty(true)
      return next
    },
    [menu, value]
  )

  const addToDictionary = useCallback(() => {
    if (!menu) return
    addCustomWord(menu.match.word)
    setMenu(null)
    setDirty(true)
    if (enabled && (focused || dirty)) {
      scheduleCheck(value)
    }
  }, [menu, enabled, focused, dirty, value, scheduleCheck])

  return {
    matches,
    menu,
    closeMenu,
    onFocus,
    onBlur,
    markDirty,
    handleContextMenu,
    applySuggestion,
    addToDictionary
  }
}
