import { dialog, BrowserWindow } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join, basename } from 'path'

const PROJECT_FILTER = {
  name: 'Book Project',
  extensions: ['db']
}

const IMAGE_FILTER = {
  name: 'Images',
  extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp']
}

export async function showOpenProjectDialog(
  window: BrowserWindow
): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    title: 'Open Book Project',
    filters: [PROJECT_FILTER],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export async function showSaveProjectDialog(
  window: BrowserWindow,
  defaultName = 'My Book Project'
): Promise<string | null> {
  const result = await dialog.showSaveDialog(window, {
    title: 'Save Book Project',
    defaultPath: `${defaultName}.db`,
    filters: [PROJECT_FILTER]
  })

  if (result.canceled || !result.filePath) return null

  let filePath = result.filePath
  if (!filePath.endsWith('.db')) {
    filePath += '.db'
  }
  return filePath
}

export async function showSelectImageDialog(
  window: BrowserWindow
): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    title: 'Select Image',
    filters: [IMAGE_FILTER],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export function ensureProjectDirectory(projectPath: string): void {
  const dir = dirname(projectPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function copyProjectToPath(sourcePath: string, destPath: string): void {
  ensureProjectDirectory(destPath)
  copyFileSync(sourcePath, destPath)
}

export function getProjectDisplayName(projectPath: string): string {
  return basename(projectPath, '.db')
}

export function getBackupsDirectory(projectPath: string): string {
  return join(dirname(projectPath), 'backups')
}
