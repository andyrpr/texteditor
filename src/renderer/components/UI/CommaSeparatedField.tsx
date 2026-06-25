import { useEffect, useState } from 'react'
import { SpellCheckedInput } from '@/components/UI/spell-checked-field'

interface CommaSeparatedFieldProps {
  value: string[]
  placeholder?: string
  onChange: (value: string[]) => void
  onBlur: () => void
}

export function CommaSeparatedField({
  value,
  placeholder = 'separate with ,',
  onChange,
  onBlur
}: CommaSeparatedFieldProps): React.JSX.Element {
  const [raw, setRaw] = useState(value.join(', '))

  useEffect(() => {
    setRaw(value.join(', '))
  }, [value])

  const commit = (): void => {
    const next = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onChange(next)
    onBlur()
  }

  return (
    <SpellCheckedInput
      value={raw}
      placeholder={placeholder}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
    />
  )
}
