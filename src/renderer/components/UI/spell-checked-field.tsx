import * as React from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Input } from '@/components/UI/input'
import { AutoGrowTextarea } from '@/components/UI/auto-grow-textarea'
import { SpellSuggestions } from '@/components/Editor/SpellSuggestions'
import { useSpellCheckField } from '@/hooks/useSpellCheckField'
import type { SpellMatch } from '@/lib/spellCheck'
import { cn } from '@/lib/utils'

function buildMirrorContent(text: string, matches: SpellMatch[]): React.ReactNode {
  if (!text) return ' '

  if (matches.length === 0) return text

  const sorted = [...matches].sort((a, b) => a.from - b.from)
  const nodes: React.ReactNode[] = []
  let cursor = 0

  for (const match of sorted) {
    if (match.from > cursor) {
      nodes.push(text.slice(cursor, match.from))
    }
    nodes.push(
      <span key={`${match.from}-${match.to}`} className="spell-error-mirror">
        {text.slice(match.from, match.to)}
      </span>
    )
    cursor = match.to
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }

  return nodes
}

interface SpellMirrorProps {
  text: string
  matches: SpellMatch[]
  multiline?: boolean
  scrollLeft?: number
  scrollTop?: number
  className?: string
}

function SpellMirror({
  text,
  matches,
  multiline,
  scrollLeft = 0,
  scrollTop = 0,
  className
}: SpellMirrorProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 text-sm shadow-sm',
        multiline ? 'py-2' : 'py-1',
        className
      )}
      aria-hidden
    >
      <div
        className={cn(
          'text-transparent',
          multiline ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
        )}
        style={{
          transform:
            scrollLeft || scrollTop
              ? `translate(${scrollLeft ? -scrollLeft : 0}px, ${scrollTop ? -scrollTop : 0}px)`
              : undefined,
          lineHeight: 'inherit',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          letterSpacing: 'inherit',
          wordSpacing: 'inherit'
        }}
      >
        {buildMirrorContent(text, matches)}
      </div>
    </div>
  )
}

type SpellCheckedInputProps = React.ComponentProps<typeof Input> & {
  spellCheckEnabled?: boolean
}

export const SpellCheckedInput = React.forwardRef<HTMLInputElement, SpellCheckedInputProps>(
  (
    {
      className,
      value = '',
      onChange,
      onFocus,
      onBlur,
      onContextMenu,
      onScroll,
      spellCheckEnabled = true,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLInputElement>(null)
    const text = String(value ?? '')
    const [mirrorScrollLeft, setMirrorScrollLeft] = useState(0)

    const {
      matches,
      menu,
      closeMenu,
      onFocus: spellFocus,
      onBlur: spellBlur,
      markDirty,
      handleContextMenu,
      applySuggestion,
      addToDictionary
    } = useSpellCheckField(text, { enabled: spellCheckEnabled })

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref]
    )

    useLayoutEffect(() => {
      const el = innerRef.current
      if (!el || !spellCheckEnabled) return

      const update = (): void => setMirrorScrollLeft(el.scrollLeft)
      update()
      el.addEventListener('scroll', update)
      el.addEventListener('input', update)
      return () => {
        el.removeEventListener('scroll', update)
        el.removeEventListener('input', update)
      }
    }, [text, spellCheckEnabled])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
      spellFocus()
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
      spellBlur()
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      markDirty()
      onChange?.(e)
    }

    const handleScroll = (e: React.UIEvent<HTMLInputElement>): void => {
      setMirrorScrollLeft(e.currentTarget.scrollLeft)
      onScroll?.(e)
    }

    const handleCtx = (e: React.MouseEvent<HTMLInputElement>): void => {
      if (innerRef.current) handleContextMenu(e, innerRef.current)
      onContextMenu?.(e)
    }

    const handleSelectSuggestion = (replacement: string): void => {
      const next = applySuggestion(replacement)
      if (next === null) return
      onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLInputElement>)
      innerRef.current?.focus()
    }

    return (
      <>
        <div className="relative">
          {spellCheckEnabled && (
            <SpellMirror text={text} matches={matches} scrollLeft={mirrorScrollLeft} />
          )}
          <Input
            ref={setRefs}
            value={value}
            spellCheck={false}
            className={cn('relative z-[1] bg-transparent', className)}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onContextMenu={handleCtx}
            onScroll={handleScroll}
            {...props}
          />
        </div>
        {menu && spellCheckEnabled && (
          <SpellSuggestions
            x={menu.x}
            y={menu.y}
            word={menu.match.word}
            suggestions={menu.match.suggestions}
            message={menu.match.message}
            onSelect={handleSelectSuggestion}
            onAddToDictionary={addToDictionary}
            onClose={closeMenu}
          />
        )}
      </>
    )
  }
)
SpellCheckedInput.displayName = 'SpellCheckedInput'

type SpellCheckedTextareaProps = React.ComponentProps<typeof AutoGrowTextarea> & {
  spellCheckEnabled?: boolean
}

export const SpellCheckedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  SpellCheckedTextareaProps
>(
  (
    {
      className,
      value = '',
      onChange,
      onFocus,
      onBlur,
      onContextMenu,
      spellCheckEnabled = true,
      rows,
      measureKey,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLTextAreaElement>(null)
    const text = String(value ?? '')
    const [mirrorScrollTop, setMirrorScrollTop] = useState(0)

    const {
      matches,
      menu,
      closeMenu,
      onFocus: spellFocus,
      onBlur: spellBlur,
      markDirty,
      handleContextMenu,
      applySuggestion,
      addToDictionary
    } = useSpellCheckField(text, { enabled: spellCheckEnabled })

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref]
    )

    useLayoutEffect(() => {
      const el = innerRef.current
      if (!el || !spellCheckEnabled) return

      const update = (): void => setMirrorScrollTop(el.scrollTop)
      update()
      el.addEventListener('scroll', update)
      return () => {
        el.removeEventListener('scroll', update)
      }
    }, [text, spellCheckEnabled])

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>): void => {
      spellFocus()
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>): void => {
      spellBlur()
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      markDirty()
      onChange?.(e)
    }

    const handleCtx = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
      if (innerRef.current) handleContextMenu(e, innerRef.current)
      onContextMenu?.(e)
    }

    const handleSelectSuggestion = (replacement: string): void => {
      const next = applySuggestion(replacement)
      if (next === null) return
      onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLTextAreaElement>)
      innerRef.current?.focus()
    }

    return (
      <>
        <div className="relative">
          {spellCheckEnabled && (
            <SpellMirror text={text} matches={matches} multiline scrollTop={mirrorScrollTop} />
          )}
          <AutoGrowTextarea
            ref={setRefs}
            value={value}
            rows={rows}
            measureKey={measureKey}
            spellCheck={false}
            className={cn('relative z-[1] bg-transparent', className)}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onContextMenu={handleCtx}
            {...props}
          />
        </div>
        {menu && spellCheckEnabled && (
          <SpellSuggestions
            x={menu.x}
            y={menu.y}
            word={menu.match.word}
            suggestions={menu.match.suggestions}
            message={menu.match.message}
            onSelect={handleSelectSuggestion}
            onAddToDictionary={addToDictionary}
            onClose={closeMenu}
          />
        )}
      </>
    )
  }
)
SpellCheckedTextarea.displayName = 'SpellCheckedTextarea'
