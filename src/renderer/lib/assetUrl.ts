export function toAssetUrl(relativePath: string): string {
  const encoded = relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `priama-asset://local/${encoded}`
}
