import { useEffect, useMemo, useRef, useState } from 'react'
import { SpellCheckedInput } from '@/components/UI/spell-checked-field'
import { cn } from '@/lib/utils'

interface ComboTagsFieldProps {
  value: string[]
  suggestions: string[]
  onChange: (value: string[]) => void
  onBlur: () => void
  placeholder?: string
  className?: string
}

function parseTokens(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function currentToken(raw: string): string {
  const parts = raw.split(',')
  return parts[parts.length - 1]?.trim() ?? ''
}

export function ComboTagsField({
  value,
  suggestions,
  onChange,
  onBlur,
  placeholder = 'separate with ,',
  className
}: ComboTagsFieldProps): React.JSX.Element {
  const [raw, setRaw] = useState(value.join(', '))
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRaw(value.join(', '))
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const token = currentToken(raw)

  const filtered = useMemo(() => {
    const q = token.toLowerCase()
    const existing = new Set(parseTokens(raw).map((t) => t.toLowerCase()))
    return suggestions.filter((s) => {
      if (existing.has(s.toLowerCase())) return false
      if (!q) return true
      return s.toLowerCase().includes(q)
    })
  }, [suggestions, raw, token])

  const commit = (): void => {
    onChange(parseTokens(raw))
    onBlur()
  }

  const handleSelect = (suggestion: string): void => {
    const parts = raw.split(',')
    parts[parts.length - 1] = ` ${suggestion}`
    const next = parts.join(',').replace(/^\s*,\s*/, '')
    setRaw(next.endsWith(',') ? next : next.trim())
    setOpen(false)
  }

  const showDropdown = open && filtered.length > 0

  return (
    <div ref={containerRef} className="relative">
      <SpellCheckedInput
        value={raw}
        placeholder={placeholder}
        className={className}
        spellCheckEnabled={!open}
        onChange={(e) => {
          setRaw(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false)
            commit()
          }, 100)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            e.currentTarget.blur()
          }
        }}
      />
      {showDropdown && (
        <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md">
          {filtered.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={cn('block w-full px-2 py-1.5 text-left text-sm hover:bg-accent')}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(suggestion)
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
