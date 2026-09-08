export function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`
}
