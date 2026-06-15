import { createWriteStream } from 'fs'
import { join, basename } from 'path'
import fse from 'fs-extra'
import archiver from 'archiver'
import type { BackupLocationStatus, BackupWarning } from '@shared/types'
import { detectPathLabel, formatBackupZipName, getBackupsDir, getProjectFolderName } from './paths'
import { getConfig } from '../config'

export async function checkPathReachable(targetPath: string): Promise<BackupLocationStatus> {
  const label = detectPathLabel(targetPath)
  try {
    if (!(await fse.pathExists(targetPath))) {
      return { path: targetPath, reachable: false, writable: false, label }
    }
    await fse.access(targetPath, fse.constants.W_OK)
    return { path: targetPath, reachable: true, writable: true, label }
  } catch {
    return { path: targetPath, reachable: false, writable: false, label }
  }
}

export async function checkBackupLocations(paths: string[]): Promise<BackupLocationStatus[]> {
  return Promise.all(paths.map(checkPathReachable))
}

async function createZipArchive(sourceDir: string, destZipPath: string, excludeDirs: string[]): Promise<void> {
  await fse.ensureDir(join(destZipPath, '..'))
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destZipPath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    output.on('close', () => resolve())
    archive.on('error', reject)

    archive.pipe(output)
    archive.glob('**/*', {
      cwd: sourceDir,
      ignore: excludeDirs.map((d) => `${d}/**`)
    })
    archive.finalize()
  })
}

async function pruneOldBackups(backupDir: string, maxBackups: number): Promise<void> {
  if (!(await fse.pathExists(backupDir))) return

  const files = (await fse.readdir(backupDir))
    .filter((f) => f.endsWith('.zip'))
    .map((f) => ({ name: f, path: join(backupDir, f) }))

  const withStats = await Promise.all(
    files.map(async (f) => ({
      ...f,
      mtime: (await fse.stat(f.path)).mtime.getTime()
    }))
  )

  withStats.sort((a, b) => b.mtime - a.mtime)

  for (const file of withStats.slice(maxBackups)) {
    await fse.remove(file.path).catch(() => {})
  }
}

export interface BackupResult {
  localBackupPath?: string
  warnings: BackupWarning[]
  unreachablePaths: string[]
}

export async function createProjectBackup(
  projectRoot: string,
  externalDestinations: string[]
): Promise<BackupResult> {
  const config = await getConfig()
  const maxBackups = config.preferences.maxBackupsPerLocation
  const warnings: BackupWarning[] = []
  const unreachablePaths: string[] = []

  const zipName = formatBackupZipName()
  const localBackupDir = getBackupsDir(projectRoot)
  await fse.ensureDir(localBackupDir)

  const tempZip = join(localBackupDir, zipName)

  try {
    await createZipArchive(projectRoot, tempZip, ['backups'])
    await pruneOldBackups(localBackupDir, maxBackups)
  } catch (err) {
    warnings.push({
      path: localBackupDir,
      message: `Local backup failed: ${err instanceof Error ? err.message : 'unknown error'}`
    })
    return { warnings, unreachablePaths }
  }

  const folderName = getProjectFolderName(projectRoot)

  for (const dest of externalDestinations) {
    const status = await checkPathReachable(dest)
    if (!status.reachable || !status.writable) {
      unreachablePaths.push(dest)
      warnings.push({
        path: dest,
        message: `Backup to ${dest} failed — drive not found`
      })
      continue
    }

    const destDir = join(dest, folderName)
    try {
      await fse.ensureDir(destDir)
      const destZip = join(destDir, zipName)
      await fse.copy(tempZip, destZip)
      await pruneOldBackups(destDir, maxBackups)
    } catch {
      unreachablePaths.push(dest)
      warnings.push({
        path: dest,
        message: `Backup to ${dest} failed — drive not found`
      })
    }
  }

  return {
    localBackupPath: tempZip,
    warnings,
    unreachablePaths
  }
}

export async function listLocalBackups(projectRoot: string): Promise<{ path: string; createdAt: string }[]> {
  const backupDir = getBackupsDir(projectRoot)
  if (!(await fse.pathExists(backupDir))) return []

  const files = await fse.readdir(backupDir)
  const zips = files.filter((f) => f.endsWith('.zip'))

  const result = await Promise.all(
    zips.map(async (f) => {
      const fullPath = join(backupDir, f)
      const stat = await fse.stat(fullPath)
      return { path: fullPath, createdAt: stat.mtime.toISOString() }
    })
  )

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
