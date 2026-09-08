import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

export const ROOT = process.cwd()
export const DATA_FILE = path.join(ROOT, 'src', 'data', 'projects.json')
export const PDF_DIR = path.join(ROOT, 'public', 'projects', 'pdfs')
export const THUMB_DIR = path.join(ROOT, 'public', 'projects', 'thumbnails')
export const categories = ['개인 프로젝트', '팀 프로젝트', '학교 프로젝트']

export function isValidDate(value) {
  if (!/^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(value)) return false
  if (value.length === 10) {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  }
  return true
}

export function isValidUrl(value) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch { return false }
}

export function makeSlug(title) {
  const slug = title.normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72).replace(/-+$/g, '')
  return slug || `project-${new Date().toISOString().slice(0, 10)}`
}

export async function assertPdf(filePath) {
  const resolved = path.resolve(filePath)
  const info = await stat(resolved).catch(() => null)
  if (!info?.isFile()) throw new Error(`PDF 파일을 찾을 수 없습니다: ${resolved}`)
  if (path.extname(resolved).toLowerCase() !== '.pdf') throw new Error('확장자가 .pdf인 파일만 등록할 수 있습니다.')
  const handle = await import('node:fs/promises').then(({ open }) => open(resolved, 'r'))
  try {
    const buffer = Buffer.alloc(5)
    await handle.read(buffer, 0, 5, 0)
    if (buffer.toString('ascii') !== '%PDF-') throw new Error('올바른 PDF 형식이 아닙니다.')
  } finally { await handle.close() }
  return resolved
}

export async function readProjects() {
  const raw = await readFile(DATA_FILE, 'utf8')
  const projects = JSON.parse(raw)
  if (!Array.isArray(projects)) throw new Error('projects.json의 최상위 값은 배열이어야 합니다.')
  return projects
}

export async function validateProject(project, index, checkAssets = true) {
  const label = `프로젝트 ${index + 1}`
  const requiredStrings = ['id', 'slug', 'title', 'summary', 'description', 'category', 'date', 'pdf', 'thumbnail']
  for (const field of requiredStrings) {
    if (typeof project[field] !== 'string' || !project[field].trim()) throw new Error(`${label}: ${field} 값이 비어 있습니다.`)
  }
  if (!/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u.test(project.slug)) throw new Error(`${label}: slug 형식이 올바르지 않습니다.`)
  if (!isValidDate(project.date)) throw new Error(`${label}: date는 YYYY, YYYY-MM 또는 YYYY-MM-DD 형식이어야 합니다.`)
  if (!Array.isArray(project.tags) || project.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) throw new Error(`${label}: tags는 비어 있지 않은 문자열 배열이어야 합니다.`)
  if (!isValidUrl(project.links?.github) || !isValidUrl(project.links?.external)) throw new Error(`${label}: 링크는 http 또는 https URL이어야 합니다.`)
  if (checkAssets) {
    await access(path.join(ROOT, 'public', project.pdf)).catch(() => { throw new Error(`${label}: PDF asset을 찾을 수 없습니다.`) })
    await access(path.join(ROOT, 'public', project.thumbnail)).catch(() => { throw new Error(`${label}: thumbnail asset을 찾을 수 없습니다.`) })
  }
}
