import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type {
  CharacterMeta,
  LocationMeta,
  LoreMeta,
  NodeType,
  ProjectMeta,
  TreeNode
} from '@shared/types'
import {
  DEFAULT_CHARACTER_META,
  DEFAULT_LOCATION_META,
  DEFAULT_LORE_META,
  DEFAULT_NOTE_META,
  parseMetadata,
  serializeMetadata
} from '@shared/types'

let db: Database.Database | null = null
let projectPath: string | null = null

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS project_meta (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled Project',
    author TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
  CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
  CREATE INDEX IF NOT EXISTS idx_nodes_sort ON nodes(parent_id, sort_order);
`

function now(): string {
  return new Date().toISOString()
}

function rowToNode(row: Record<string, unknown>): TreeNode {
  return {
    id: row.id as string,
    parentId: (row.parent_id as string) || null,
    type: row.type as NodeType,
    title: row.title as string,
    sortOrder: row.sort_order as number,
    content: row.content as string,
    metadata: row.metadata as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function getProjectPath(): string | null {
  return projectPath
}

export function isOpen(): boolean {
  return db !== null
}

export function openDatabase(path: string): void {
  closeDatabase()
  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  projectPath = path
}

export function createDatabase(path: string, title: string, author: string): ProjectMeta {
  openDatabase(path)
  const id = uuidv4()
  const timestamp = now()

  db!.exec('DELETE FROM nodes')
  db!.exec('DELETE FROM project_meta')

  db!.prepare(`
    INSERT INTO project_meta (id, title, author, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, author, timestamp, timestamp)

  const welcomeId = uuidv4()
  db!.prepare(`
    INSERT INTO nodes (id, parent_id, type, title, sort_order, content, metadata, created_at, updated_at)
    VALUES (?, NULL, 'chapter', 'Chapter 1', 0, '', '{}', ?, ?)
  `).run(welcomeId, timestamp, timestamp)

  const sceneId = uuidv4()
  db!.prepare(`
    INSERT INTO nodes (id, parent_id, type, title, sort_order, content, metadata, created_at, updated_at)
    VALUES (?, ?, 'scene', 'Scene 1', 0, '', '{}', ?, ?)
  `).run(sceneId, welcomeId, timestamp, timestamp)

  return getProjectMeta()!
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    projectPath = null
  }
}

function requireDb(): Database.Database {
  if (!db) throw new Error('No project is open')
  return db
}

export function getProjectMeta(): ProjectMeta | null {
  if (!db) return null
  const row = db.prepare('SELECT * FROM project_meta LIMIT 1').get() as Record<string, unknown> | undefined
  if (!row) return null
  return {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function updateProjectMeta(updates: { title?: string; author?: string }): ProjectMeta {
  const database = requireDb()
  const current = getProjectMeta()!
  const title = updates.title ?? current.title
  const author = updates.author ?? current.author
  const timestamp = now()

  database.prepare(`
    UPDATE project_meta SET title = ?, author = ?, updated_at = ?
    WHERE id = ?
  `).run(title, author, timestamp, current.id)

  return getProjectMeta()!
}

export function touchProject(): string {
  const database = requireDb()
  const timestamp = now()
  database.prepare('UPDATE project_meta SET updated_at = ?').run(timestamp)
  return timestamp
}

export function getAllNodes(): TreeNode[] {
  const database = requireDb()
  const rows = database.prepare('SELECT * FROM nodes ORDER BY sort_order ASC').all()
  return rows.map((row) => rowToNode(row as Record<string, unknown>))
}

export function getNode(id: string): TreeNode | null {
  const database = requireDb()
  const row = database.prepare('SELECT * FROM nodes WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToNode(row) : null
}

function defaultMetadataForType(type: NodeType): string {
  switch (type) {
    case 'character':
      return serializeMetadata(DEFAULT_CHARACTER_META)
    case 'location':
      return serializeMetadata(DEFAULT_LOCATION_META)
    case 'lore':
      return serializeMetadata(DEFAULT_LORE_META)
    case 'note':
      return serializeMetadata(DEFAULT_NOTE_META)
    default:
      return '{}'
  }
}

export function createNode(
  parentId: string | null,
  type: NodeType,
  title: string
): TreeNode {
  const database = requireDb()
  const id = uuidv4()
  const timestamp = now()

  const maxOrder = database.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) as max_order
    FROM nodes WHERE parent_id IS ? OR (parent_id IS NULL AND ? IS NULL)
  `).get(parentId, parentId) as { max_order: number }

  database.prepare(`
    INSERT INTO nodes (id, parent_id, type, title, sort_order, content, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, '', ?, ?, ?)
  `).run(id, parentId, type, title, maxOrder.max_order + 1, defaultMetadataForType(type), timestamp, timestamp)

  touchProject()
  return getNode(id)!
}

export function updateNode(
  id: string,
  updates: {
    title?: string
    content?: string
    metadata?: string
    parentId?: string | null
    sortOrder?: number
  }
): TreeNode {
  const database = requireDb()
  const current = getNode(id)
  if (!current) throw new Error(`Node ${id} not found`)

  const timestamp = now()
  database.prepare(`
    UPDATE nodes SET
      title = ?,
      content = ?,
      metadata = ?,
      parent_id = ?,
      sort_order = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    updates.title ?? current.title,
    updates.content ?? current.content,
    updates.metadata ?? current.metadata,
    updates.parentId !== undefined ? updates.parentId : current.parentId,
    updates.sortOrder ?? current.sortOrder,
    timestamp,
    id
  )

  touchProject()
  return getNode(id)!
}

export function deleteNode(id: string): void {
  const database = requireDb()
  database.prepare('DELETE FROM nodes WHERE id = ?').run(id)
  touchProject()
}

export function reorderNodes(
  items: { id: string; parentId: string | null; sortOrder: number }[]
): TreeNode[] {
  const database = requireDb()
  const timestamp = now()
  const stmt = database.prepare(`
    UPDATE nodes SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?
  `)

  const transaction = database.transaction(() => {
    for (const item of items) {
      stmt.run(item.parentId, item.sortOrder, timestamp, item.id)
    }
  })
  transaction()
  touchProject()
  return getAllNodes()
}

export function getEntityNodes(): TreeNode[] {
  return getAllNodes().filter((n) =>
    ['character', 'location', 'lore'].includes(n.type)
  )
}

export function searchEntitiesByName(name: string): TreeNode[] {
  const lower = name.toLowerCase()
  return getEntityNodes().filter((node) => {
    if (node.title.toLowerCase() === lower) return true
    if (node.type === 'character') {
      const meta = parseMetadata<CharacterMeta>(node.metadata, DEFAULT_CHARACTER_META)
      return meta.aliases.some((a) => a.toLowerCase() === lower)
    }
    return false
  })
}

export function getManuscriptContent(): { title: string; content: string }[] {
  const nodes = getAllNodes()
  const chapters = nodes.filter((n) => n.type === 'chapter').sort((a, b) => a.sortOrder - b.sortOrder)
  const result: { title: string; content: string }[] = []

  for (const chapter of chapters) {
    const scenes = nodes
      .filter((n) => n.parentId === chapter.id && n.type === 'scene')
      .sort((a, b) => a.sortOrder - b.sortOrder)

    let chapterContent = ''
    for (const scene of scenes) {
      chapterContent += `<h2>${scene.title}</h2>${scene.content}`
    }
    result.push({ title: chapter.title, content: chapterContent || chapter.content })
  }

  return result
}

export function getChapterContent(chapterId: string): { title: string; content: string } | null {
  const chapter = getNode(chapterId)
  if (!chapter || chapter.type !== 'chapter') return null

  const nodes = getAllNodes()
  const scenes = nodes
    .filter((n) => n.parentId === chapter.id && n.type === 'scene')
    .sort((a, b) => a.sortOrder - b.sortOrder)

  let content = ''
  for (const scene of scenes) {
    content += `<h2>${scene.title}</h2>${scene.content}`
  }

  return { title: chapter.title, content: content || chapter.content }
}

export type { CharacterMeta, LocationMeta, LoreMeta }
