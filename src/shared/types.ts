export type EntityType = 'character' | 'location' | 'lore'

export type WikiEntityType = EntityType | 'note'

export type FolderScope = 'manuscript' | 'characters' | 'locations' | 'lore' | 'notes'

export type NodeType = 'folder' | 'chapter' | 'scene' | 'character' | 'location' | 'lore' | 'note'

export type TrashCategory = 'chapters' | 'scenes' | 'characters' | 'locations' | 'lore' | 'notes'

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

export interface FolderMeta {
  scope: FolderScope
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
  deletedAt?: string | null
  originalParentId?: string | null
}

export type CharacterRelationshipType =
  | 'Family'
  | 'Friend'
  | 'Enemy'
  | 'Rival'
  | 'Mentor'
  | 'Romantic'
  | 'Ally'
  | 'Unknown'

export const CHARACTER_RELATIONSHIP_TYPES: CharacterRelationshipType[] = [
  'Family',
  'Friend',
  'Enemy',
  'Rival',
  'Mentor',
  'Romantic',
  'Ally',
  'Unknown'
]

export interface CharacterRelationship {
  characterId: string
  type: CharacterRelationshipType
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
  relationships: CharacterRelationship[]
  startsAs: string
  endsAs: string
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

export type ExportPageSize = 'letter' | 'a4'
export type ExportMarginPreset = 'narrow' | 'normal' | 'wide'
export type ExportFontFamily = 'serif' | 'sans'

export interface ExportFormatting {
  fontFamily: ExportFontFamily
  fontSize: number
  marginPreset: ExportMarginPreset
  pageSize: ExportPageSize
}

export const DEFAULT_EXPORT_FORMATTING: ExportFormatting = {
  fontFamily: 'serif',
  fontSize: 12,
  marginPreset: 'normal',
  pageSize: 'letter'
}

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'epub'
  title: string
  author: string
  genre?: string
  scope: 'chapters' | 'manuscript'
  chapterIds?: string[]
  formatting: ExportFormatting
}

export interface ExportSection {
  id: string
  title: string
  level: 'chapter' | 'scene'
  html: string
}

export interface ManuscriptChapterRef {
  id: string
  title: string
  pathLabel: string
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

export interface NavigationSyncState {
  selectedNodeId: string | null
  selectedContainerId: string | null
  selectedEntityId: string | null
  selectedEntityType: WikiEntityType | null
  expandedSections: string[]
  expandedFolders: string[]
  rightPanelOpen: boolean
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
  deletedAt?: string | null
  originalParentId?: string | null
  folderScope?: FolderScope
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
    folders: TomesIndexEntry[]
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
  deletedAt?: string | null
  originalParentId?: string | null
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
  startsAs: '',
  endsAs: '',
  notes: '',
  imagePath: null
}

export function normalizeCharacterMeta(raw: Partial<CharacterMeta> & Record<string, unknown>): CharacterMeta {
  const relationships: CharacterRelationship[] = Array.isArray(raw.relationships)
    ? raw.relationships.map((entry) => {
        const rel = entry as Partial<CharacterRelationship> & { description?: string }
        const type =
          rel.type && CHARACTER_RELATIONSHIP_TYPES.includes(rel.type as CharacterRelationshipType)
            ? (rel.type as CharacterRelationshipType)
            : 'Unknown'
        return {
          characterId: typeof rel.characterId === 'string' ? rel.characterId : '',
          type
        }
      })
    : []

  return {
    ...DEFAULT_CHARACTER_META,
    ...raw,
    aliases: Array.isArray(raw.aliases) ? raw.aliases.map(String) : DEFAULT_CHARACTER_META.aliases,
    relationships,
    startsAs: typeof raw.startsAs === 'string' ? raw.startsAs : DEFAULT_CHARACTER_META.startsAs,
    endsAs: typeof raw.endsAs === 'string' ? raw.endsAs : DEFAULT_CHARACTER_META.endsAs,
    imagePath: typeof raw.imagePath === 'string' ? raw.imagePath : raw.imagePath === null ? null : DEFAULT_CHARACTER_META.imagePath
  }
}

export const DEFAULT_LOCATION_META: LocationMeta = {
  type: '',
  description: '',
  connectedLocations: [],
  notableCharacters: [],
  notes: '',
  imagePath: null
}

export function normalizeLocationMeta(raw: Partial<LocationMeta> & Record<string, unknown>): LocationMeta {
  const parsed = { ...DEFAULT_LOCATION_META, ...raw }
  return {
    ...parsed,
    connectedLocations: Array.isArray(parsed.connectedLocations) ? parsed.connectedLocations : [],
    notableCharacters: Array.isArray(parsed.notableCharacters) ? parsed.notableCharacters : [],
    imagePath:
      typeof raw.imagePath === 'string'
        ? raw.imagePath
        : raw.imagePath === null
          ? null
          : DEFAULT_LOCATION_META.imagePath
  }
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

export function normalizeNoteMeta(raw: Partial<NoteMeta> & Record<string, unknown>): NoteMeta {
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : []
  return { tags }
}

export const DEFAULT_CHAPTER_META: ChapterMeta = {
  structure: 'scenes'
}

export const DEFAULT_FOLDER_META: FolderMeta = {
  scope: 'manuscript'
}

export const TRASH_RETENTION_DAYS = 50

export const TRASH_CATEGORY_LABELS: Record<TrashCategory, string> = {
  chapters: 'Chapters',
  scenes: 'Scenes',
  characters: 'Characters',
  locations: 'Locations',
  lore: 'Lore',
  notes: 'Notes'
}

export const SIDEBAR_MAX_WIDTH = 280
export const SIDEBAR_MIN_WIDTH = 56
export const RIGHT_PANEL_MIN_WIDTH = 320
export const RIGHT_PANEL_MAX_WIDTH = 640

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
