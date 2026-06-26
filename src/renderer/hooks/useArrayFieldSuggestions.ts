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
 * Returns a sorted, deduplicated list of individual items from string[] metadata
 * fields across other entries of the same node type.
 */
export function useArrayFieldSuggestions(
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
      if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === 'string' && item.trim()) {
            values.push(item.trim())
          }
        }
      }
    }

    return [...new Set(values)].sort((a, b) => a.localeCompare(b))
  }, [nodes, nodeType, field, currentNodeId])
}
