import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { TomesManifest } from '@shared/types'
import { TOMES_MAGIC, PROJECT_FILENAME } from '@shared/types'
import { getProjectRoot } from './paths'

export interface ValidationResult {
  valid: boolean
  error?: string
  manifest?: TomesManifest
  projectRoot?: string
}

export async function validateTomesFile(tomesPath: string): Promise<ValidationResult> {
  if (!tomesPath.endsWith(PROJECT_FILENAME) && !tomesPath.endsWith('.tomes')) {
    return { valid: false, error: 'File must be a project.tomes file' }
  }

  if (!existsSync(tomesPath)) {
    return { valid: false, error: 'Project file not found' }
  }

  let manifest: TomesManifest
  try {
    const raw = await readFile(tomesPath, 'utf-8')
    manifest = JSON.parse(raw) as TomesManifest
  } catch {
    return { valid: false, error: 'Project file is corrupted or invalid JSON' }
  }

  if (manifest.__tomes !== TOMES_MAGIC) {
    return { valid: false, error: 'Not a valid Priama project file' }
  }

  if (!manifest.title || !manifest.version || !manifest.id) {
    return { valid: false, error: 'Project file is missing required fields' }
  }

  const projectRoot = getProjectRoot(tomesPath)
  const requiredDirs = [
    join(projectRoot, 'manuscript'),
    join(projectRoot, 'wiki')
  ]

  for (const dir of requiredDirs) {
    if (!existsSync(dir)) {
      return { valid: false, error: 'Project folder structure is incomplete' }
    }
  }

  return { valid: true, manifest, projectRoot }
}
