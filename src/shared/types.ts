export type EntityType = 'character' | 'location' | 'lore'

export type NodeType = 'chapter' | 'scene' | 'character' | 'location' | 'lore' | 'note'

export type Genre =
  | 'Fantasy'
  | 'Sci-Fi'
  | 'Romance'
  | 'Mystery'
  | 'Horror'
  | 'Other'
  | ''

export interface ProjectMeta {
  id: string
  title: string
  author: string
  genre?: string
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

export interface BackupWarning {
  path: string
  message: string
}

export interface SaveResult {
  success: boolean
  lastSaved: string
  backupPath?: string
  backupWarnings?: BackupWarning[]
  unreachableBackupPaths?: string[]
}

export interface RecentProjectEntry {
  id: string
  title: string
  author: string
  primaryPath: string
  lastOpened: string
  coverColor: string
}

export interface RecentProjectWithStatus extends RecentProjectEntry {
  exists: boolean
}

export interface BackupLocationStatus {
  path: string
  reachable: boolean
  writable: boolean
  label: string
}

export interface PriamaPreferences {
  autosaveIntervalSeconds: number
  maxBackupsPerLocation: number
  theme: 'light' | 'dark'
  defaultChapterStructure?: ChapterStructure
  skipChapterStructurePrompt?: boolean
}

export type ChapterStructure = 'simple' | 'scenes'

export interface ChapterMeta {
  structure: ChapterStructure
}

export interface ProjectUiState {
  sectionOrder: string[]
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface SecondaryWindowState {
  nodeId: string
  bounds: WindowBounds
}

export interface WindowLayoutState {
  sidebarWidth: number
  rightPanelWidth: number
  sidebarDetached: boolean
  entityDetached: boolean
  secondaryWindows: SecondaryWindowState[]
}

export interface PriamaConfig {
  version: string
  recentProjects: RecentProjectEntry[]
  backupLocations: Record<string, string[]>
  preferences: PriamaPreferences
  windowLayout?: WindowLayoutState
}

export interface CreateProjectInput {
  title: string
  author: string
  genre: string
  primaryParentDir: string
  backupLocations: string[]
}

export interface TomesIndexEntry {
  id: string
  filename: string
  title: string
  sortOrder: number
  parentId?: string | null
}

export interface TomesManifest {
  __tomes: string
  id: string
  title: string
  author: string
  genre: string
  createdAt: string
  lastSavedAt: string
  version: string
  uiState?: ProjectUiState
  index: {
    chapters: TomesIndexEntry[]
    scenes: TomesIndexEntry[]
    characters: TomesIndexEntry[]
    locations: TomesIndexEntry[]
    lore: TomesIndexEntry[]
    notes: TomesIndexEntry[]
  }
}

export interface TxDFile {
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

export const TOMES_MAGIC = '1.0'
export const PROJECT_FILENAME = 'project.tomes'
export const TXD_EXT = '.txd'

export const COVER_COLORS = [
  '#7C3AED',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#0891B2',
  '#4F46E5'
]

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

export const DEFAULT_CHAPTER_META: ChapterMeta = {
  structure: 'scenes'
}

export const SIDEBAR_MAX_WIDTH = 280
export const SIDEBAR_MIN_WIDTH = 56
export const RIGHT_PANEL_MAX_WIDTH = 360
export const RIGHT_PANEL_MIN_WIDTH = 280

export const DEFAULT_SECTION_ORDER = ['characters', 'locations', 'lore', 'notes']

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
