export type EntityType = 'character' | 'location' | 'lore'

export type NodeType = 'chapter' | 'scene' | 'character' | 'location' | 'lore' | 'note'

export interface ProjectMeta {
  id: string
  title: string
  author: string
  createdAt: string
  updatedAt: string
}

export interface TreeNode {
  id: string
  parentId: string | null
  type: NodeType
  title: string
  sortOrder: number
  content: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface CharacterMeta {
  aliases: string[]
  age: string
  race: string
  gender: string
  physicalDescription: string
  personality: string
  background: string
  role: string
  relationships: { characterId: string; description: string }[]
  notes: string
  imagePath: string | null
}

export interface LocationMeta {
  type: string
  description: string
  connectedLocations: string[]
  notableCharacters: string[]
  notes: string
  imagePath: string | null
}

export interface LoreMeta {
  category: string
  description: string
  relatedCharacters: string[]
  relatedLocations: string[]
  notes: string
}

export interface NoteMeta {
  tags: string[]
}

export type EntityMeta = CharacterMeta | LocationMeta | LoreMeta | NoteMeta

export interface EntityMention {
  entityId: string
  entityType: EntityType
  name: string
}

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'epub'
  title: string
  author: string
  scope: 'chapter' | 'manuscript'
  nodeId?: string
}

export interface BackupInfo {
  path: string
  createdAt: string
}

export interface ProjectInfo {
  path: string
  meta: ProjectMeta
}

export interface SaveResult {
  success: boolean
  lastSaved: string
  backupPath?: string
}

export interface IpcChannels {
  'project:create': { path: string; title: string; author: string }
  'project:open': { path: string }
  'project:close': void
  'project:getInfo': void
  'project:save': void
  'project:updateMeta': { title?: string; author?: string }

  'dialog:openProject': void
  'dialog:saveProjectAs': void
  'dialog:selectImage': void

  'tree:getAll': void
  'tree:create': { parentId: string | null; type: NodeType; title: string }
  'tree:update': { id: string; title?: string; content?: string; metadata?: string; parentId?: string | null; sortOrder?: number }
  'tree:delete': { id: string }
  'tree:reorder': { items: { id: string; parentId: string | null; sortOrder: number }[] }

  'entity:getAll': void
  'entity:getById': { id: string }

  'export:document': ExportOptions

  'backup:list': void
}

export const DEFAULT_CHARACTER_META: CharacterMeta = {
  aliases: [],
  age: '',
  race: '',
  gender: '',
  physicalDescription: '',
  personality: '',
  background: '',
  role: '',
  relationships: [],
  notes: '',
  imagePath: null
}

export const DEFAULT_LOCATION_META: LocationMeta = {
  type: '',
  description: '',
  connectedLocations: [],
  notableCharacters: [],
  notes: '',
  imagePath: null
}

export const DEFAULT_LORE_META: LoreMeta = {
  category: '',
  description: '',
  relatedCharacters: [],
  relatedLocations: [],
  notes: ''
}

export const DEFAULT_NOTE_META: NoteMeta = {
  tags: []
}

export function parseMetadata<T>(raw: string, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function serializeMetadata(meta: EntityMeta): string {
  return JSON.stringify(meta)
}
