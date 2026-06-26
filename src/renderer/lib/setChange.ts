export function setsChanged(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return true
  for (const item of a) {
    if (!b.has(item)) return true
  }
  return false
}
