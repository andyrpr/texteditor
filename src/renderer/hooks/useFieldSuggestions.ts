import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  DEFAULT_CHARACTER_META,
  DEFAULT_LOCATION_META,
  DEFAULT_LORE_META,
  parseMetadata
} from '@shared/types'

type SupportedNodeType = 'character' | 'location' | 'lore'

const DEFAULTS: Record<SupportedNodeType, object> = {
  character: DEFAULT_CHARACTER_META,
  location: DEFAULT_LOCATION_META,
  lore: DEFAULT_LORE_META
}

/**
 * Returns a sorted, deduplicated list of values that other entries of the same
 * node type have stored in the given metadata field. Excludes the current node
 * so only values from *other* entries appear as suggestions.
 */
export function useFieldSuggestions(
  nodeType: SupportedNodeType,
  field: string,
  currentNodeId: string
): string[] {
  const nodes = useAppStore((s) => s.nodes)

  return useMemo(() => {
    const values: string[] = []

    for (const node of nodes) {
      if (node.type !== nodeType) continue
      if (node.deletedAt) continue
      if (node.id === currentNodeId) continue

      const meta = parseMetadata(node.metadata, DEFAULTS[nodeType]) as Record<string, unknown>
      const val = meta[field]
      if (typeof val === 'string' && val.trim()) {
        values.push(val.trim())
      }
    }

    return [...new Set(values)].sort((a, b) => a.localeCompare(b))
  }, [nodes, nodeType, field, currentNodeId])
}
