import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, basename } from 'path'
import type { BackupInfo } from '@shared/types'
import { getBackupsDirectory } from './fileSystem'

const MAX_BACKUPS = 10

function formatBackupFilename(projectPath: string): string {
  const name = basename(projectPath, '.db')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${name}_${timestamp}.db`
}

export function createBackup(projectPath: string): BackupInfo | null {
  if (!existsSync(projectPath)) return null

  const backupsDir = getBackupsDirectory(projectPath)
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true })
  }

  const backupFilename = formatBackupFilename(projectPath)
  const backupPath = join(backupsDir, backupFilename)

  copyFileSync(projectPath, backupPath)
  pruneOldBackups(projectPath)

  return {
    path: backupPath,
    createdAt: new Date().toISOString()
  }
}

function pruneOldBackups(projectPath: string): void {
  const backupsDir = getBackupsDirectory(projectPath)
  if (!existsSync(backupsDir)) return

  const projectName = basename(projectPath, '.db')
  const backups = readdirSync(backupsDir)
    .filter((f) => f.startsWith(`${projectName}_`) && f.endsWith('.db'))
    .map((f) => {
      const fullPath = join(backupsDir, f)
      return {
        path: fullPath,
        createdAt: statSync(fullPath).mtime.toISOString()
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (backups.length <= MAX_BACKUPS) return

  for (const backup of backups.slice(MAX_BACKUPS)) {
    try {
      unlinkSync(backup.path)
    } catch {
      // ignore deletion errors
    }
  }
}

export function listBackups(projectPath: string): BackupInfo[] {
  const backupsDir = getBackupsDirectory(projectPath)
  if (!existsSync(backupsDir)) return []

  const projectName = basename(projectPath, '.db')
  return readdirSync(backupsDir)
    .filter((f) => f.startsWith(`${projectName}_`) && f.endsWith('.db'))
    .map((f) => {
      const fullPath = join(backupsDir, f)
      return {
        path: fullPath,
        createdAt: statSync(fullPath).mtime.toISOString()
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
