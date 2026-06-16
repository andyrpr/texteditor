import * as React from 'react'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { Textarea } from '@/components/UI/textarea'
import { cn } from '@/lib/utils'

const GROW_CAP = 3.5

export const AutoGrowTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number; measureKey?: string }
>(({ className, rows = 3, value, onChange, measureKey, ...props }, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const minHeightRef = useRef<number | null>(null)

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  const adjustHeight = useCallback((el?: HTMLTextAreaElement | null) => {
    const target = el ?? innerRef.current
    if (!target) return

    if (minHeightRef.current === null) {
      target.style.height = 'auto'
      target.style.minHeight = '0'
      minHeightRef.current = target.scrollHeight
    }

    const minH = minHeightRef.current
    const maxH = minH * GROW_CAP

    target.style.minHeight = `${minH}px`
    target.style.maxHeight = `${maxH}px`
    target.style.height = '0'
    target.style.overflowY = 'hidden'
    const contentHeight = target.scrollHeight
    const next = Math.min(Math.max(contentHeight, minH), maxH)
    target.style.height = `${next}px`
    target.style.overflowY = contentHeight > maxH ? 'auto' : 'hidden'
  }, [])

  useLayoutEffect(() => {
    minHeightRef.current = null
    adjustHeight()
  }, [measureKey, rows, adjustHeight])

  useLayoutEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  return (
    <Textarea
      ref={setRefs}
      rows={rows}
      value={value}
      onChange={(e) => {
        onChange?.(e)
        adjustHeight(e.currentTarget)
      }}
      className={cn('panel-textarea-scroll min-h-0 resize-none', className)}
      {...props}
    />
  )
})
AutoGrowTextarea.displayName = 'AutoGrowTextarea'
