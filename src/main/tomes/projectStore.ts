import { join, extname, relative } from 'path'
import fse from 'fs-extra'
import { v4 as uuidv4 } from 'uuid'
import type {
  BookSettings,
  CreateProjectInput,
  FolderMeta,
  FolderScope,
  NodeType,
  ProjectMeta,
  ProjectUiState,
  TomesIndexEntry,
  TomesManifest,
  TreeNode,
  TxDFile,
  ChapterStructure
} from '@shared/types'
import {
  DEFAULT_CHARACTER_META,
  DEFAULT_BOOK_SETTINGS,
  DEFAULT_LOCATION_META,
  DEFAULT_LORE_META,
  DEFAULT_NOTE_META,
  DEFAULT_CHAPTER_META,
  DEFAULT_FOLDER_META,
  DEFAULT_SECTION_ORDER,
  TOMES_MAGIC,
  PROJECT_FILENAME,
  TXD_EXT,
  TRASH_RETENTION_DAYS,
  serializeMetadata,
  parseMetadata,
  normalizeBookSettings
} from '@shared/types'
import {
  getNodeDir,
  getTomesPath,
  sanitizeFolderName,
  getBackupsDir,
  getManuscriptDir,
  getWikiDir,
  getAssetsDir,
  getCharacterImagesDir,
  getLocationImagesDir
} from './paths'
import { validateTomesFile } from './validate'
import {
  addRecentProject,
  setBackupLocations,
  updateRecentLastOpened,
  getBackupLocations,
  getConfig,
  updateRecentTitle
} from '../config'
import { createProjectBackup } from './backup'

let projectRoot: string | null = null
let tomesPath: string | null = null
let manifest: TomesManifest | null = null
const nodeCache = new Map<string, TreeNode>()

function now(): string {
  return new Date().toISOString()
}

function indexKeyForType(type: NodeType): keyof TomesManifest['index'] {
  switch (type) {
    case 'folder':
      return 'folders'
    case 'chapter':
      return 'chapters'
    case 'scene':
      return 'scenes'
    case 'character':
      return 'characters'
    case 'location':
      return 'locations'
    case 'lore':
      return 'lore'
    case 'note':
      return 'notes'
  }
}

function scopeToEntityIndexKey(scope: FolderScope): keyof TomesManifest['index'] {
  switch (scope) {
    case 'characters':
      return 'characters'
    case 'locations':
      return 'locations'
    case 'lore':
      return 'lore'
    case 'notes':
      return 'notes'
    default:
      return 'chapters'
  }
}

function normalizeManifest(m: TomesManifest): TomesManifest {
  if (!m.index.folders) {
    m.index.folders = []
  }
  return m
}

function defaultMetadataForType(type: NodeType, scope?: FolderScope): string {
  switch (type) {
    case 'folder':
      return serializeMetadata({ ...DEFAULT_FOLDER_META, scope: scope ?? 'manuscript' })
    case 'character':
      return serializeMetadata(DEFAULT_CHARACTER_META)
    case 'location':
      return serializeMetadata(DEFAULT_LOCATION_META)
    case 'lore':
      return serializeMetadata(DEFAULT_LORE_META)
    case 'note':
      return serializeMetadata(DEFAULT_NOTE_META)
    case 'chapter':
      return serializeMetadata(DEFAULT_CHAPTER_META)
    default:
      return '{}'
  }
}

function generateFilename(type: NodeType, index: number, parentIndex?: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  switch (type) {
    case 'folder':
      return `folder-${pad(index)}${TXD_EXT}`
    case 'chapter':
      return `chapter-${pad(index)}${TXD_EXT}`
    case 'scene':
      return `scene-${pad(parentIndex ?? 1)}-${pad(index)}${TXD_EXT}`
    case 'character':
      return `character-${pad(index)}${TXD_EXT}`
    case 'location':
      return `location-${pad(index)}${TXD_EXT}`
    case 'lore':
      return `lore-${pad(index)}${TXD_EXT}`
    case 'note':
      return `note-${pad(index)}${TXD_EXT}`
  }
}

function getFolderScopeFromNode(node: TreeNode): FolderScope {
  return parseMetadata<FolderMeta>(node.metadata, DEFAULT_FOLDER_META).scope
}

function txdToNode(txd: TxDFile, entry?: TomesIndexEntry): TreeNode {
  return {
    id: txd.id,
    parentId: txd.parentId,
    type: txd.type,
    title: txd.title,
    sortOrder: txd.sortOrder,
    content: txd.content,
    metadata: txd.metadata,
    createdAt: txd.createdAt,
    updatedAt: txd.updatedAt,
    deletedAt: txd.deletedAt ?? entry?.deletedAt ?? null,
    originalParentId: txd.originalParentId ?? entry?.originalParentId ?? null
  }
}

function nodeToTxd(node: TreeNode): TxDFile {
  return {
    id: node.id,
    parentId: node.parentId,
    type: node.type,
    title: node.title,
    sortOrder: node.sortOrder,
    content: node.content,
    metadata: node.metadata,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    deletedAt: node.deletedAt ?? null,
    originalParentId: node.originalParentId ?? null
  }
}

async function readTxdFile(filePath: string): Promise<TxDFile> {
  const raw = await fse.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as TxDFile
}

async function writeTxdFile(filePath: string, txd: TxDFile): Promise<void> {
  await fse.ensureDir(join(filePath, '..'))
  await fse.writeFile(filePath, JSON.stringify(txd, null, 2), 'utf-8')
}

function getTxdPath(filename: string, type: NodeType, scope?: FolderScope): string {
  if (!projectRoot) throw new Error('No project open')
  return join(getNodeDir(projectRoot, type, scope), filename)
}

function getTxdPathForNode(node: TreeNode, filename: string): string {
  const scope = node.type === 'folder' ? getFolderScopeFromNode(node) : undefined
  return getTxdPath(filename, node.type, scope)
}

async function writeManifest(): Promise<void> {
  if (!manifest || !tomesPath) throw new Error('No project open')
  manifest.lastSavedAt = now()
  await fse.writeFile(tomesPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

async function loadAllNodes(): Promise<TreeNode[]> {
  if (!manifest || !projectRoot) return []

  const nodes: TreeNode[] = []
  const categories: { key: keyof TomesManifest['index']; type: NodeType }[] = [
    { key: 'folders', type: 'folder' },
    { key: 'chapters', type: 'chapter' },
    { key: 'scenes', type: 'scene' },
    { key: 'characters', type: 'character' },
    { key: 'locations', type: 'location' },
    { key: 'lore', type: 'lore' },
    { key: 'notes', type: 'note' }
  ]

  for (const { key, type } of categories) {
    const entries = manifest.index[key] ?? []
    for (const entry of entries) {
      const filePath = getTxdPathForEntry(entry, type)
      if (await fse.pathExists(filePath)) {
        const txd = await readTxdFile(filePath)
        const node = txdToNode(txd, entry)
        nodes.push(node)
        nodeCache.set(node.id, node)
      }
    }
  }

  return nodes
}

function getEntryScope(entry: TomesIndexEntry, type: NodeType): FolderScope | undefined {
  if (type !== 'folder') return undefined
  if (entry.folderScope) return entry.folderScope
  const cached = nodeCache.get(entry.id)
  if (cached) return getFolderScopeFromNode(cached)
  return 'manuscript'
}

function getTxdPathForEntry(entry: TomesIndexEntry, type: NodeType): string {
  const scope = getEntryScope(entry, type)
  return getTxdPath(entry.filename, type, scope)
}

function getEntryType(entryId: string): NodeType {
  if (!manifest) throw new Error('No project open')
  if (manifest.index.folders?.some((e) => e.id === entryId)) return 'folder'
  if (manifest.index.chapters.some((e) => e.id === entryId)) return 'chapter'
  if (manifest.index.scenes.some((e) => e.id === entryId)) return 'scene'
  if (manifest.index.characters.some((e) => e.id === entryId)) return 'character'
  if (manifest.index.locations.some((e) => e.id === entryId)) return 'location'
  if (manifest.index.lore.some((e) => e.id === entryId)) return 'lore'
  return 'note'
}

export function isOpen(): boolean {
  return projectRoot !== null && manifest !== null
}

export function getProjectPath(): string | null {
  return tomesPath
}

export function getProjectRootPath(): string | null {
  return projectRoot
}

export function getProjectMeta(): ProjectMeta | null {
  if (!manifest) return null
  return {
    id: manifest.id,
    title: manifest.title,
    author: manifest.author,
    genre: manifest.genre,
    bookSettings: normalizeBookSettings(manifest.bookSettings ?? {}),
    createdAt: manifest.createdAt,
    updatedAt: manifest.lastSavedAt
  }
}

export async function createProject(input: CreateProjectInput): Promise<{
  path: string
  meta: ProjectMeta
  projectRoot: string
}> {
  const folderName = sanitizeFolderName(input.title)
  const root = join(input.primaryParentDir, folderName)
  const tomes = getTomesPath(root)

  if (await fse.pathExists(root)) {
    throw new Error(`A folder named "${folderName}" already exists at this location`)
  }

  const id = uuidv4()
  const timestamp = now()

  await fse.ensureDir(getManuscriptDir(root))
  await fse.ensureDir(join(getManuscriptDir(root), 'folders'))
  await fse.ensureDir(join(getWikiDir(root), 'characters'))
  await fse.ensureDir(join(getWikiDir(root), 'characters', 'folders'))
  await fse.ensureDir(getCharacterImagesDir(root))
  await fse.ensureDir(join(getWikiDir(root), 'locations'))
  await fse.ensureDir(join(getWikiDir(root), 'locations', 'folders'))
  await fse.ensureDir(join(getWikiDir(root), 'lore'))
  await fse.ensureDir(join(getWikiDir(root), 'lore', 'folders'))
  await fse.ensureDir(join(getWikiDir(root), 'notes'))
  await fse.ensureDir(join(getWikiDir(root), 'notes', 'folders'))
  await fse.ensureDir(getBackupsDir(root))
  await fse.ensureDir(getAssetsDir(root))

  const chapterId = uuidv4()
  const sceneId = uuidv4()
  const chapterFilename = generateFilename('chapter', 1)
  const sceneFilename = generateFilename('scene', 1, 1)

  manifest = {
    __tomes: TOMES_MAGIC,
    id,
    title: input.title,
    author: input.author,
    genre: input.genre,
    createdAt: timestamp,
    lastSavedAt: timestamp,
    version: '1.0',
    uiState: { sectionOrder: [...DEFAULT_SECTION_ORDER] },
    index: {
      folders: [],
      chapters: [{ id: chapterId, filename: chapterFilename, title: 'Chapter 1', sortOrder: 0 }],
      scenes: [{ id: sceneId, filename: sceneFilename, title: 'Scene 1', sortOrder: 0, parentId: chapterId }],
      characters: [],
      locations: [],
      lore: [],
      notes: []
    }
  }

  projectRoot = root
  tomesPath = tomes
  nodeCache.clear()

  await fse.writeFile(tomes, JSON.stringify(manifest, null, 2), 'utf-8')

  const chapterNode: TreeNode = {
    id: chapterId,
    parentId: null,
    type: 'chapter',
    title: 'Chapter 1',
    sortOrder: 0,
    content: '',
    metadata: '{}',
    createdAt: timestamp,
    updatedAt: timestamp
  }

  const sceneNode: TreeNode = {
    id: sceneId,
    parentId: chapterId,
    type: 'scene',
    title: 'Scene 1',
    sortOrder: 0,
    content: '',
    metadata: '{}',
    createdAt: timestamp,
    updatedAt: timestamp
  }

  await writeTxdFile(getTxdPath(chapterFilename, 'chapter'), nodeToTxd(chapterNode))
  await writeTxdFile(getTxdPath(sceneFilename, 'scene'), nodeToTxd(sceneNode))
  nodeCache.set(chapterId, chapterNode)
  nodeCache.set(sceneId, sceneNode)

  await addRecentProject({
    id,
    title: input.title,
    author: input.author,
    primaryPath: tomes
  })

  if (input.backupLocations.length > 0) {
    await setBackupLocations(id, input.backupLocations)
  }

  return {
    path: tomes,
    projectRoot: root,
    meta: getProjectMeta()!
  }
}

export async function openProject(tomesFilePath: string): Promise<{
  path: string
  meta: ProjectMeta
  nodes: TreeNode[]
  uiState: ProjectUiState
}> {
  const validation = await validateTomesFile(tomesFilePath)
  if (!validation.valid || !validation.manifest || !validation.projectRoot) {
    throw new Error(validation.error ?? 'Invalid project')
  }

  closeProject()

  manifest = normalizeManifest(validation.manifest)
  projectRoot = validation.projectRoot
  tomesPath = tomesFilePath
  nodeCache.clear()

  const nodes = await loadAllNodes()
  await purgeExpiredTrash()
  await updateRecentLastOpened(manifest.id)

  return {
    path: tomesPath,
    meta: getProjectMeta()!,
    nodes,
    uiState: getUiState()
  }
}

export function closeProject(): void {
  projectRoot = null
  tomesPath = null
  manifest = null
  nodeCache.clear()
}

export function getAllNodes(): TreeNode[] {
  return Array.from(nodeCache.values())
}

export function getNode(id: string): TreeNode | null {
  return nodeCache.get(id) ?? null
}

export async function createNode(
  parentId: string | null,
  type: NodeType,
  title: string,
  options?: { metadata?: string; scope?: FolderScope }
): Promise<TreeNode> {
  if (!manifest || !projectRoot) throw new Error('No project open')

  const id = uuidv4()
  const timestamp = now()
  const indexKey = indexKeyForType(type)
  const siblings = manifest.index[indexKey].filter((e) => {
    if (e.deletedAt) return false
    const entryParent = e.parentId ?? null
    const targetParent = parentId ?? null
    if (type === 'scene') return e.parentId === parentId
    return entryParent === targetParent
  })
  const sortOrder = siblings.length

  let filename: string
  if (type === 'scene') {
    const parentChapter = parentId
      ? manifest.index.chapters.find((c) => c.id === parentId)
      : null
    const chapterIdx = parentChapter
      ? manifest.index.chapters.indexOf(parentChapter) + 1
      : 1
    filename = generateFilename('scene', sortOrder + 1, chapterIdx)
  } else {
    filename = generateFilename(type, siblings.length + 1)
  }

  const metadata =
    options?.metadata ??
    defaultMetadataForType(type, options?.scope ?? (type === 'folder' ? 'manuscript' : undefined))

  const entry: TomesIndexEntry = {
    id,
    filename,
    title,
    sortOrder,
    ...(parentId ? { parentId } : {}),
    ...(type === 'folder' && options?.scope ? { folderScope: options.scope } : {})
  }

  manifest.index[indexKey].push(entry)

  const node: TreeNode = {
    id,
    parentId,
    type,
    title,
    sortOrder,
    content: '',
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    originalParentId: null
  }

  const scope = type === 'folder' ? getFolderScopeFromNode(node) : undefined
  await writeTxdFile(getTxdPath(filename, type, scope), nodeToTxd(node))
  await writeManifest()
  nodeCache.set(id, node)
  return node
}

export async function createFolder(
  scope: FolderScope,
  parentId: string | null,
  title: string
): Promise<TreeNode> {
  return createNode(parentId, 'folder', title, {
    scope,
    metadata: serializeMetadata({ scope })
  })
}

export async function updateNode(
  id: string,
  updates: {
    title?: string
    content?: string
    metadata?: string
    parentId?: string | null
    sortOrder?: number
  }
): Promise<TreeNode> {
  if (!manifest) throw new Error('No project open')

  const current = nodeCache.get(id)
  if (!current) throw new Error(`Node ${id} not found`)

  const timestamp = now()
  const updated: TreeNode = {
    ...current,
    title: updates.title ?? current.title,
    content: updates.content ?? current.content,
    metadata: updates.metadata ?? current.metadata,
    parentId: updates.parentId !== undefined ? updates.parentId : current.parentId,
    sortOrder: updates.sortOrder ?? current.sortOrder,
    updatedAt: timestamp
  }

  const type = getEntryType(id)
  const indexKey = indexKeyForType(type)
  const entry = manifest.index[indexKey].find((e) => e.id === id)
  if (!entry) throw new Error(`Index entry ${id} not found`)

  if (updates.title) entry.title = updates.title
  if (updates.sortOrder !== undefined) entry.sortOrder = updates.sortOrder
  if (updates.parentId !== undefined) entry.parentId = updates.parentId

  await writeTxdFile(getTxdPathForNode(updated, entry.filename), nodeToTxd(updated))
  await writeManifest()
  nodeCache.set(id, updated)
  return updated
}

export async function deleteNode(id: string): Promise<void> {
  return permanentDeleteNode(id)
}

async function applyTrashFields(
  id: string,
  fields: { deletedAt?: string | null; originalParentId?: string | null; parentId?: string | null }
): Promise<TreeNode> {
  const current = nodeCache.get(id)
  if (!current) throw new Error(`Node ${id} not found`)

  const timestamp = now()
  const updated: TreeNode = {
    ...current,
    ...fields,
    updatedAt: timestamp
  }

  const type = getEntryType(id)
  const indexKey = indexKeyForType(type)
  const entry = manifest!.index[indexKey].find((e) => e.id === id)
  if (!entry) throw new Error(`Index entry ${id} not found`)

  if (fields.deletedAt !== undefined) entry.deletedAt = fields.deletedAt
  if (fields.originalParentId !== undefined) entry.originalParentId = fields.originalParentId
  if (fields.parentId !== undefined) entry.parentId = fields.parentId

  await writeTxdFile(getTxdPathForNode(updated, entry.filename), nodeToTxd(updated))
  nodeCache.set(id, updated)
  return updated
}

function getFolderChildIds(parentId: string, scope: FolderScope): string[] {
  if (!manifest) return []
  const ids: string[] = []

  for (const entry of manifest.index.folders) {
    if (entry.deletedAt) continue
    if ((entry.parentId ?? null) !== parentId) continue
    const node = nodeCache.get(entry.id)
    if (node && getFolderScopeFromNode(node) === scope) ids.push(entry.id)
  }

  if (scope === 'manuscript') {
    for (const entry of manifest.index.chapters) {
      if (!entry.deletedAt && (entry.parentId ?? null) === parentId) ids.push(entry.id)
    }
  } else {
    const key = scopeToEntityIndexKey(scope)
    for (const entry of manifest.index[key]) {
      if (!entry.deletedAt && (entry.parentId ?? null) === parentId) ids.push(entry.id)
    }
  }

  return ids
}

async function softDeleteNode(id: string, timestamp: string): Promise<void> {
  const node = nodeCache.get(id)
  if (!node || node.deletedAt) return

  await applyTrashFields(id, {
    deletedAt: timestamp,
    originalParentId: node.parentId
  })

  if (node.type === 'chapter') {
    const childScenes = manifest!.index.scenes.filter((s) => s.parentId === id && !s.deletedAt)
    for (const scene of childScenes) {
      await softDeleteNode(scene.id, timestamp)
    }
  }

  if (node.type === 'folder') {
    const scope = getFolderScopeFromNode(node)
    const childIds = getFolderChildIds(id, scope)
    for (const childId of childIds) {
      await softDeleteNode(childId, timestamp)
    }
  }
}

export async function moveToTrash(id: string): Promise<TreeNode[]> {
  if (!manifest) throw new Error('No project open')
  const timestamp = now()
  await softDeleteNode(id, timestamp)
  await writeManifest()
  return getAllNodes()
}

export async function restoreNode(
  id: string,
  targetParentId?: string | null
): Promise<TreeNode[]> {
  if (!manifest) throw new Error('No project open')
  const node = nodeCache.get(id)
  if (!node || !node.deletedAt) return getAllNodes()

  let newParentId: string | null =
    targetParentId !== undefined ? targetParentId : node.originalParentId ?? null

  if (node.type === 'scene') {
    const originalChapter = node.originalParentId
      ? nodeCache.get(node.originalParentId)
      : null
    if (originalChapter && !originalChapter.deletedAt) {
      newParentId = originalChapter.id
    } else if (targetParentId === undefined) {
      throw new Error('RESTORE_NEEDS_TARGET')
    }
  }

  const siblingsKey = indexKeyForType(node.type)
  const siblings = manifest.index[siblingsKey].filter(
    (e) => !e.deletedAt && (e.parentId ?? null) === (newParentId ?? null)
  )

  const updated: TreeNode = {
    ...node,
    deletedAt: null,
    originalParentId: null,
    parentId: newParentId,
    sortOrder: siblings.length,
    updatedAt: now()
  }

  const entry = manifest.index[siblingsKey].find((e) => e.id === id)!
  entry.deletedAt = null
  entry.originalParentId = null
  entry.parentId = newParentId
  entry.sortOrder = updated.sortOrder

  await writeTxdFile(getTxdPathForNode(updated, entry.filename), nodeToTxd(updated))
  nodeCache.set(id, updated)

  if (node.type === 'folder') {
    const scope = getFolderScopeFromNode(node)
    const childIds = getAllTrashedDescendants(id, scope)
    for (const childId of childIds) {
      await restoreNode(childId)
    }
  }

  if (node.type === 'chapter') {
    const deletedAt = node.deletedAt
    const trashedScenes = manifest.index.scenes.filter(
      (s) => s.parentId === id && s.deletedAt === deletedAt
    )
    for (const scene of trashedScenes) {
      const sceneNode = nodeCache.get(scene.id)
      if (!sceneNode) continue
      const sceneUpdated: TreeNode = {
        ...sceneNode,
        deletedAt: null,
        originalParentId: null,
        updatedAt: now()
      }
      scene.deletedAt = null
      scene.originalParentId = null
      await writeTxdFile(getTxdPathForNode(sceneUpdated, scene.filename), nodeToTxd(sceneUpdated))
      nodeCache.set(scene.id, sceneUpdated)
    }
  }

  await writeManifest()
  return getAllNodes()
}

function getAllTrashedDescendants(folderId: string, scope: FolderScope): string[] {
  if (!manifest) return []
  const ids: string[] = []
  const folderIds = [folderId]

  while (folderIds.length > 0) {
    const current = folderIds.pop()!
    for (const entry of manifest.index.folders) {
      if (entry.deletedAt && (entry.parentId ?? null) === current) {
        const node = nodeCache.get(entry.id)
        if (node && getFolderScopeFromNode(node) === scope) {
          ids.push(entry.id)
          folderIds.push(entry.id)
        }
      }
    }
    if (scope === 'manuscript') {
      for (const entry of manifest.index.chapters) {
        if (entry.deletedAt && (entry.parentId ?? null) === current) ids.push(entry.id)
      }
    } else {
      const key = scopeToEntityIndexKey(scope)
      for (const entry of manifest.index[key]) {
        if (entry.deletedAt && (entry.parentId ?? null) === current) ids.push(entry.id)
      }
    }
  }

  return ids
}

async function permanentDeleteNode(id: string): Promise<void> {
  if (!manifest || !projectRoot) throw new Error('No project open')

  const type = getEntryType(id)
  const indexKey = indexKeyForType(type)
  const entry = manifest.index[indexKey].find((e) => e.id === id)
  if (!entry) return

  const node = nodeCache.get(id)
  const filePath = getTxdPathForEntry(entry, type)
  await fse.remove(filePath).catch(() => {})

  manifest.index[indexKey] = manifest.index[indexKey].filter((e) => e.id !== id)

  if (type === 'chapter') {
    const childScenes = manifest.index.scenes.filter((s) => s.parentId === id)
    for (const scene of childScenes) {
      await permanentDeleteNode(scene.id)
    }
  }

  if (type === 'folder' && node) {
    const folderScope = getFolderScopeFromNode(node)
    const childIds = getFolderChildIds(id, folderScope)
    for (const childId of [...childIds]) {
      const child = nodeCache.get(childId)
      if (child?.deletedAt) {
        await permanentDeleteNode(childId)
      }
    }
  }

  nodeCache.delete(id)
  await writeManifest()
}

export async function permanentDelete(id: string): Promise<TreeNode[]> {
  await permanentDeleteNode(id)
  return getAllNodes()
}

export async function purgeExpiredTrash(): Promise<void> {
  if (!manifest) return

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - TRASH_RETENTION_DAYS)
  const cutoffIso = cutoff.toISOString()

  const allKeys: (keyof TomesManifest['index'])[] = [
    'folders',
    'chapters',
    'scenes',
    'characters',
    'locations',
    'lore',
    'notes'
  ]

  const toPurge: string[] = []
  for (const key of allKeys) {
    for (const entry of manifest.index[key] ?? []) {
      if (entry.deletedAt && entry.deletedAt < cutoffIso) {
        toPurge.push(entry.id)
      }
    }
  }

  for (const id of toPurge) {
    await permanentDeleteNode(id)
  }

  if (toPurge.length > 0) {
    await writeManifest()
  }
}

export async function reorderNodes(
  items: { id: string; parentId: string | null; sortOrder: number }[]
): Promise<TreeNode[]> {
  if (!manifest) throw new Error('No project open')

  for (const item of items) {
    const type = getEntryType(item.id)
    const indexKey = indexKeyForType(type)
    const entry = manifest.index[indexKey].find((e) => e.id === item.id)
    if (entry) {
      entry.sortOrder = item.sortOrder
      entry.parentId = item.parentId
    }

    const node = nodeCache.get(item.id)
    if (node) {
      const updated = {
        ...node,
        parentId: item.parentId,
        sortOrder: item.sortOrder,
        updatedAt: now()
      }
      nodeCache.set(item.id, updated)
      const entry2 = manifest.index[indexKey].find((e) => e.id === item.id)
      if (entry2) {
        await writeTxdFile(getTxdPathForNode(updated, entry2.filename), nodeToTxd(updated))
      }
    }
  }

  await writeManifest()
  return getAllNodes()
}

export function getEntityNodes(): TreeNode[] {
  return getAllNodes().filter(
    (n) => !n.deletedAt && ['character', 'location', 'lore'].includes(n.type)
  )
}

export async function updateProjectMeta(updates: {
  title?: string
  author?: string
  genre?: string
}): Promise<ProjectMeta> {
  if (!manifest) throw new Error('No project open')

  if (updates.title) manifest.title = updates.title
  if (updates.author) manifest.author = updates.author
  if (updates.genre !== undefined) manifest.genre = updates.genre

  await writeManifest()
  return getProjectMeta()!
}

export async function saveProject(): Promise<{
  success: boolean
  lastSaved: string
  backupPath?: string
  backupWarnings: { path: string; message: string }[]
  unreachableBackupPaths: string[]
}> {
  if (!manifest || !projectRoot || !tomesPath) {
    return { success: false, lastSaved: '', backupWarnings: [], unreachableBackupPaths: [] }
  }

  await writeManifest()
  const lastSaved = manifest.lastSavedAt

  const externalDests = await getBackupLocations(manifest.id)
  const backupResult = await createProjectBackup(projectRoot, externalDests)

  return {
    success: true,
    lastSaved,
    backupPath: backupResult.localBackupPath,
    backupWarnings: backupResult.warnings,
    unreachableBackupPaths: backupResult.unreachablePaths
  }
}

export async function getRecentProjectsWithStatus(): Promise<
  import('@shared/types').RecentProjectWithStatus[]
> {
  const config = await getConfig()

  return Promise.all(
    config.recentProjects.map(async (p) => ({
      ...p,
      exists: await fse.pathExists(p.primaryPath)
    }))
  )
}

export async function renameRecentProject(
  projectId: string,
  title: string
): Promise<{ success: boolean; title: string }> {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Title cannot be empty')

  const config = await getConfig()
  const entry = config.recentProjects.find((p) => p.id === projectId)
  if (!entry) throw new Error('Project not found in recents')

  if (await fse.pathExists(entry.primaryPath)) {
    const validation = await validateTomesFile(entry.primaryPath)
    if (validation.valid && validation.manifest) {
      validation.manifest.title = trimmed
      validation.manifest.lastSavedAt = now()
      await fse.writeFile(entry.primaryPath, JSON.stringify(validation.manifest, null, 2), 'utf-8')

      if (manifest && manifest.id === projectId) {
        manifest.title = trimmed
        manifest.lastSavedAt = validation.manifest.lastSavedAt
      }
    }
  }

  await updateRecentTitle(projectId, trimmed)
  return { success: true, title: trimmed }
}

export function getUiState(): ProjectUiState {
  if (!manifest) {
    return { sectionOrder: [...DEFAULT_SECTION_ORDER] }
  }
  return manifest.uiState ?? { sectionOrder: [...DEFAULT_SECTION_ORDER] }
}

export async function updateUiState(uiState: ProjectUiState): Promise<ProjectUiState> {
  if (!manifest) throw new Error('No project open')
  manifest.uiState = uiState
  await writeManifest()
  return getUiState()
}

export async function createChapter(
  structure: ChapterStructure,
  parentId: string | null = null
): Promise<TreeNode> {
  const chapter = await createNode(parentId, 'chapter', 'New Chapter')
  const meta = { ...DEFAULT_CHAPTER_META, structure }
  await updateNode(chapter.id, { metadata: JSON.stringify(meta) })

  if (structure === 'scenes') {
    await createNode(chapter.id, 'scene', 'New Scene')
  }

  return getNode(chapter.id)!
}

export function getSyncState(): {
  path: string | null
  meta: ProjectMeta | null
  nodes: TreeNode[]
  uiState: ProjectUiState
} {
  return {
    path: tomesPath,
    meta: getProjectMeta(),
    nodes: getAllNodes(),
    uiState: getUiState()
  }
}

export async function importEntityImage(
  nodeId: string,
  sourcePath: string,
  entityType: 'character' | 'location'
): Promise<string> {
  if (!projectRoot) throw new Error('No project open')

  const ext = extname(sourcePath).toLowerCase() || '.png'
  const imagesDir =
    entityType === 'character'
      ? getCharacterImagesDir(projectRoot)
      : getLocationImagesDir(projectRoot)
  await fse.ensureDir(imagesDir)

  const filename = `${nodeId}${ext}`
  const destPath = join(imagesDir, filename)
  await fse.copy(sourcePath, destPath, { overwrite: true })

  return relative(projectRoot, destPath).split('\\').join('/')
}

export async function importCharacterImage(nodeId: string, sourcePath: string): Promise<string> {
  return importEntityImage(nodeId, sourcePath, 'character')
}

export async function updateBookSettings(updates: Partial<BookSettings>): Promise<BookSettings> {
  if (!manifest) throw new Error('No project open')
  manifest.bookSettings = normalizeBookSettings({ ...manifest.bookSettings, ...updates })
  await writeManifest()
  return manifest.bookSettings
}

export async function importCoverImage(sourcePath: string): Promise<string> {
  if (!projectRoot) throw new Error('No project open')

  const ext = extname(sourcePath).toLowerCase() || '.png'
  const assetsDir = getAssetsDir(projectRoot)
  await fse.ensureDir(assetsDir)

  const destPath = join(assetsDir, `cover${ext}`)
  await fse.copy(sourcePath, destPath, { overwrite: true })

  return relative(projectRoot, destPath).split('\\').join('/')
}
