import { dialog, BrowserWindow, app } from 'electron'
import { homedir } from 'os'
import { join } from 'path'
import { PROJECT_FILENAME } from '@shared/types'

const TOMES_FILTER = {
  name: 'Priama Project',
  extensions: ['tomes']
}

const IMAGE_FILTER = {
  name: 'Images',
  extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp']
}

export async function showOpenTomesDialog(window: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    title: 'Open Priama Project',
    filters: [TOMES_FILTER],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export async function showChooseFolderDialog(
  window: BrowserWindow,
  title = 'Choose Folder'
): Promise<string | null> {
  const parent = BrowserWindow.getFocusedWindow() ?? window
  parent.focus()
  app.focus({ steal: true })

  const result = await dialog.showOpenDialog(parent, {
    title,
    defaultPath: join(homedir(), 'Documents'),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder'
  })

  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export async function showSelectImageDialog(window: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    title: 'Select Image',
    filters: [IMAGE_FILTER],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export { PROJECT_FILENAME }
