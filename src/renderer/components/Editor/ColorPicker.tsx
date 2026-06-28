import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/UI/tooltip'
import { Button } from '@/components/UI/button'

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Brown', value: '#92400e' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Yellow', value: '#ca8a04' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Red', value: '#dc2626' }
]

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Gray', value: '#e5e7eb' },
  { label: 'Brown', value: '#fde68a' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Purple', value: '#ddd6fe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Red', value: '#fecaca' }
]

interface ColorPickerProps {
  currentColor: string
  colors: typeof TEXT_COLORS
  onSelect: (color: string) => void
  tooltip: string
  icon: React.ReactNode
}

function ColorPickerButton({
  currentColor,
  colors,
  onSelect,
  tooltip,
  icon
}: ColorPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div className="flex flex-col items-center gap-0">
                {icon}
                <div
                  className="h-0.5 w-3.5 rounded-full"
                  style={{ backgroundColor: currentColor || 'currentColor' }}
                />
              </div>
            </Button>
          </Popover.Trigger>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content
          className="z-50 rounded-lg border border-border bg-popover p-2 shadow-md"
          align="start"
          sideOffset={4}
        >
          <div className="grid grid-cols-5 gap-1">
            {colors.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                className={cn(
                  'h-6 w-6 rounded-md border transition-transform hover:scale-110',
                  !c.value && 'border-dashed border-muted-foreground/40',
                  c.value && 'border-transparent',
                  currentColor === c.value && 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
                )}
                style={{ backgroundColor: c.value || 'transparent' }}
                onClick={() => {
                  onSelect(c.value)
                  setOpen(false)
                }}
              >
                {!c.value && <span className="text-[10px] text-muted-foreground">✕</span>}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { ColorPickerButton, TEXT_COLORS, HIGHLIGHT_COLORS }
