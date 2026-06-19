import fse from 'fs-extra'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { getProjectRootPath } from '../tomes/projectStore'

/** Absolute file:// URL for epub-gen-memory to read a project cover image. */
export async function resolveCoverFileUrl(coverImagePath: string | null): Promise<string | undefined> {
  if (!coverImagePath) return undefined

  const root = getProjectRootPath()
  if (!root) return undefined

  const absolutePath = join(root, coverImagePath)
  if (!(await fse.pathExists(absolutePath))) return undefined

  return pathToFileURL(absolutePath).href
}
