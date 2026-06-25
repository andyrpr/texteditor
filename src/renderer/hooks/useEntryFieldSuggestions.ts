import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { DEFAULT_PEOPLE_META, normalizePeopleMeta, parseMetadata } from '@shared/types'

/**
 * Returns a sorted, deduplicated list of string values that other entries in the
 * given category have stored in the given metadata field.
 */
export function useEntryFieldSuggestions(
  categoryId: string,
  field: string,
  currentNodeId: string
): string[] {
  const nodes = useAppStore((s) => s.nodes)

  return useMemo(() => {
    const values: string[] = []

    for (const node of nodes) {
      if (node.type !== 'entry') continue
      if (node.categoryId !== categoryId) continue
      if (node.deletedAt) continue
      if (node.id === currentNodeId) continue

      const meta = normalizePeopleMeta(
        parseMetadata(node.metadata, DEFAULT_PEOPLE_META) as Partial<typeof DEFAULT_PEOPLE_META> &
          Record<string, unknown>
      )
      const val = meta[field as keyof typeof meta]
      if (typeof val === 'string' && val.trim()) {
        values.push(val.trim())
      }
    }

    return [...new Set(values)].sort((a, b) => a.localeCompare(b))
  }, [nodes, categoryId, field, currentNodeId])
}
