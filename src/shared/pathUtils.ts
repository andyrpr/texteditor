export function detectPathLabel(path: string): string {
  const lower = path.toLowerCase()
  if (lower.includes('icloud')) return 'iCloud Drive'
  if (lower.includes('google drive')) return 'Google Drive'
  if (lower.includes('mega')) return 'MEGA'
  if (path.startsWith('/Volumes/')) return 'External Drive'
  if (/^[A-Za-z]:/.test(path)) {
    const drive = path.slice(0, 2).toUpperCase()
    if (drive !== 'C:') return 'External Drive'
  }
  return 'Local Folder'
}

export function truncatePath(path: string, maxLen = 40): string {
  let display = path
  if (path.startsWith('/Users/')) {
    const parts = path.split('/')
    if (parts.length > 2) {
      display = '~/' + parts.slice(3).join('/')
    }
  }
  if (display.length <= maxLen) return display
  const start = display.slice(0, Math.floor(maxLen / 2) - 1)
  const end = display.slice(-(Math.floor(maxLen / 2) - 2))
  return `${start}…${end}`
}
