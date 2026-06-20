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

export type ChapterLabelStyle = 'number-and-title' | 'number-only' | 'title-only' | 'none'
export type ChapterNumberFormat = 'digits' | 'words' | 'roman'
export type ChapterNumberingScope = 'manuscript-global' | 'export-relative'
export type ParagraphStyle = 'first-line-indent' | 'spaced'
export type TextAlignStyle = 'justify' | 'left'

export interface BookSettings {
  coverImagePath: string | null
  chapterLabelStyle: ChapterLabelStyle
  chapterNumberFormat: ChapterNumberFormat
  chapterNumberingScope: ChapterNumberingScope
  chapterLabelPrefix: string
  showSceneTitles: boolean
  sceneBreakMarker: string
  includeTitlePage: boolean
  dedication: string
  copyrightText: string
  paragraphStyle: ParagraphStyle
  textAlign: TextAlignStyle
}

export const DEFAULT_BOOK_SETTINGS: BookSettings = {
  coverImagePath: null,
  chapterLabelStyle: 'number-and-title',
  chapterNumberFormat: 'digits',
  chapterNumberingScope: 'manuscript-global',
  chapterLabelPrefix: 'Chapter',
  showSceneTitles: false,
  sceneBreakMarker: '* * *',
  includeTitlePage: true,
  dedication: '',
  copyrightText: '',
  paragraphStyle: 'first-line-indent',
  textAlign: 'justify'
}

const CHAPTER_LABEL_STYLES: ChapterLabelStyle[] = [
  'number-and-title',
  'number-only',
  'title-only',
  'none'
]
const CHAPTER_NUMBER_FORMATS: ChapterNumberFormat[] = ['digits', 'words', 'roman']
const CHAPTER_NUMBERING_SCOPES: ChapterNumberingScope[] = ['manuscript-global', 'export-relative']
const PARAGRAPH_STYLES: ParagraphStyle[] = ['first-line-indent', 'spaced']
const TEXT_ALIGN_STYLES: TextAlignStyle[] = ['justify', 'left']

export function normalizeBookSettings(raw: Partial<BookSettings> & Record<string, unknown>): BookSettings {
  const chapterLabelStyle = CHAPTER_LABEL_STYLES.includes(raw.chapterLabelStyle as ChapterLabelStyle)
    ? (raw.chapterLabelStyle as ChapterLabelStyle)
    : DEFAULT_BOOK_SETTINGS.chapterLabelStyle
  const chapterNumberFormat = CHAPTER_NUMBER_FORMATS.includes(raw.chapterNumberFormat as ChapterNumberFormat)
    ? (raw.chapterNumberFormat as ChapterNumberFormat)
    : DEFAULT_BOOK_SETTINGS.chapterNumberFormat
  const chapterNumberingScope = CHAPTER_NUMBERING_SCOPES.includes(
    raw.chapterNumberingScope as ChapterNumberingScope
  )
    ? (raw.chapterNumberingScope as ChapterNumberingScope)
    : DEFAULT_BOOK_SETTINGS.chapterNumberingScope
  const paragraphStyle = PARAGRAPH_STYLES.includes(raw.paragraphStyle as ParagraphStyle)
    ? (raw.paragraphStyle as ParagraphStyle)
    : DEFAULT_BOOK_SETTINGS.paragraphStyle
  const textAlign = TEXT_ALIGN_STYLES.includes(raw.textAlign as TextAlignStyle)
    ? (raw.textAlign as TextAlignStyle)
    : DEFAULT_BOOK_SETTINGS.textAlign

  const sceneBreakMarker =
    typeof raw.sceneBreakMarker === 'string'
      ? raw.sceneBreakMarker.trim()
      : DEFAULT_BOOK_SETTINGS.sceneBreakMarker

  return {
    coverImagePath:
      typeof raw.coverImagePath === 'string' && raw.coverImagePath.trim()
        ? raw.coverImagePath.trim()
        : null,
    chapterLabelStyle,
    chapterNumberFormat,
    chapterNumberingScope,
    chapterLabelPrefix:
      typeof raw.chapterLabelPrefix === 'string'
        ? raw.chapterLabelPrefix.trim()
        : DEFAULT_BOOK_SETTINGS.chapterLabelPrefix,
    showSceneTitles: raw.showSceneTitles === true,
    sceneBreakMarker,
    includeTitlePage: raw.includeTitlePage !== false,
    dedication: typeof raw.dedication === 'string' ? raw.dedication : '',
    copyrightText: typeof raw.copyrightText === 'string' ? raw.copyrightText : '',
    paragraphStyle,
    textAlign
  }
}

export interface ProjectMeta {
  id: string
  title: string
  author: string
  genre?: string
  bookSettings: BookSettings
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
  displayHeading: string | null
  sceneBreakBefore?: boolean
}

export interface DevicePreviewRequestOptions {
  scope: 'chapter' | 'manuscript'
  nodeId?: string
}

export interface DevicePreviewResponse {
  epub: ArrayBuffer
  title: string
  author: string
}

export type DevicePresetId =
  | 'kindle-6'
  | 'kindle-paperwhite'
  | 'kindle-scribe'
  | 'pocketbook-era'
  | 'pocketbook-verse'
  | 'pocketbook-inkpad-4'
  | 'ipad-mini'
  | 'ipad-10'
  | 'iphone-se'
  | 'iphone-15'
  | 'iphone-15-pro-max'
  | 'samsung-galaxy-s27'

export interface DevicePreset {
  id: DevicePresetId
  label: string
  widthPx: number
  heightPx: number
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'kindle-6', label: 'Kindle (6")', widthPx: 1072, heightPx: 1448 },
  { id: 'kindle-paperwhite', label: 'Kindle Paperwhite (6.8")', widthPx: 1236, heightPx: 1648 },
  { id: 'kindle-scribe', label: 'Kindle Scribe (10.2")', widthPx: 1860, heightPx: 2480 },
  { id: 'pocketbook-era', label: 'PocketBook Era (6")', widthPx: 1072, heightPx: 1448 },
  { id: 'pocketbook-verse', label: 'PocketBook Verse (6.8")', widthPx: 1264, heightPx: 1680 },
  { id: 'pocketbook-inkpad-4', label: 'PocketBook InkPad 4 (7.8")', widthPx: 1404, heightPx: 1872 },
  { id: 'ipad-mini', label: 'iPad mini (8.3")', widthPx: 1488, heightPx: 2266 },
  { id: 'ipad-10', label: 'iPad (10.9")', widthPx: 1640, heightPx: 2360 },
  { id: 'iphone-se', label: 'iPhone SE', widthPx: 750, heightPx: 1334 },
  { id: 'iphone-15', label: 'iPhone 15', widthPx: 1170, heightPx: 2532 },
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', widthPx: 1290, heightPx: 2796 },
  { id: 'samsung-galaxy-s27', label: 'Samsung Galaxy S27', widthPx: 1440, heightPx: 3120 }
]

export function deviceMaxDimension(preset: DevicePreset): number {
  return Math.max(preset.widthPx, preset.heightPx)
}

export const LARGEST_DEVICE_PRESET = DEVICE_PRESETS.reduce((largest, preset) =>
  deviceMaxDimension(preset) > deviceMaxDimension(largest) ? preset : largest
)

export const LARGEST_DEVICE_MAX_DIMENSION = deviceMaxDimension(LARGEST_DEVICE_PRESET)

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
  bookSettings?: BookSettings
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
