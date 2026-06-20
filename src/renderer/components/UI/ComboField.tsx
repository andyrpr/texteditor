import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/UI/input'
import { cn } from '@/lib/utils'

interface ComboFieldProps {
  value: string
  suggestions: string[]
  onChange: (v: string) => void
  onBlur: () => void
  placeholder?: string
  className?: string
}

export function ComboField({
  value,
  suggestions,
  onChange,
  onBlur,
  placeholder,
  className
}: ComboFieldProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return suggestions
    return suggestions.filter((s) => s.toLowerCase().includes(q))
  }, [suggestions, query])

  const handleFocus = (): void => {
    setOpen(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    setOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      setOpen(false)
      e.currentTarget.blur()
    }
  }

  const handleBlur = (): void => {
    setTimeout(() => {
      setOpen(false)
      onBlur()
    }, 100)
  }

  const handleSelect = (suggestion: string): void => {
    setQuery(suggestion)
    onChange(suggestion)
    setOpen(false)
  }

  const showDropdown = open && suggestions.length > 0 && filtered.length > 0

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        placeholder={placeholder}
        className={className}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md">
          {filtered.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                'block w-full px-2 py-1.5 text-left text-sm hover:bg-accent',
                suggestion === value && 'bg-accent/50'
              )}
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
