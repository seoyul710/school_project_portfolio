import { constants } from 'node:fs'
import { copyFile, lstat, mkdir, mkdtemp, open, readFile, realpath, rename, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { isValidDate, isValidUrl, makeSlug, validateProject } from './project-utils.mjs'

export const MAX_PDF_BYTES = 20 * 1024 * 1024
export class RegistrationError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

export function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RegistrationError('프로젝트 입력 형식을 확인해 주세요.')
  const limits = { title: 120, summary: 250, description: 10000, category: 30, date: 10 }
  const labels = { title: '제목', summary: '한 줄 요약', description: '상세 설명', category: 'Category', date: '날짜' }
  const result = {}
  for (const [field, limit] of Object.entries(limits)) {
    const value = typeof input[field] === 'string' ? input[field].trim() : ''
    if (!value || value.length > limit) throw new RegistrationError(`${labels[field]}은(는) 1~${limit}자로 입력해 주세요.`)
    result[field] = value
  }
  if (!isValidDate(result.date)) throw new RegistrationError('날짜는 실제 존재하는 YYYY, YYYY-MM 또는 YYYY-MM-DD 형식으로 입력해 주세요.')
  if (!Array.isArray(input.tags) || !input.tags.length || input.tags.length > 20 || input.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 60)) {
    throw new RegistrationError('기술 Tags는 각각 60자 이내로 1~20개 입력해 주세요.')
  }
  result.tags = [...new Set(input.tags.map(tag => tag.trim()))]
  const links = {}
  for (const key of ['github', 'external']) {
    const value = input.links?.[key]
    if (value === undefined || value === '') continue
    if (typeof value !== 'string' || value.length > 2048 || !isValidUrl(value) || new URL(value).username || new URL(value).password) {
      throw new RegistrationError('링크는 계정 비밀번호가 포함되지 않은 http 또는 https URL로 입력해 주세요.')
    }
    links[key] = value.trim()
  }
  if (Object.keys(links).length) result.links = links
  return result
}

export function validatePdfBytes(bytes, filename) {
  if (typeof filename !== 'string' || !/\.pdf$/i.test(filename)) throw new RegistrationError('PDF 파일(.pdf)을 선택해 주세요.')
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_PDF_BYTES) throw new RegistrationError('PDF는 0바이트보다 크고 20MB 이하여야 합니다.', 413)
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new RegistrationError('PDF 내용이 올바르지 않습니다. 다른 PDF 파일을 선택해 주세요.')
}

export async function readProjectData(root) {
  const projects = JSON.parse(await readFile(path.join(root, 'src/data/projects.json'), 'utf8'))
  if (!Array.isArray(projects)) throw new RegistrationError('기존 프로젝트 데이터가 배열이 아닙니다. 파일을 확인해 주세요.', 409)
  const ids = new Set(), slugs = new Set()
  for (const [index, project] of projects.entries()) {
    await validateProject(project, index, false)
    if (ids.has(project.id) || slugs.has(project.slug)) throw new RegistrationError('기존 데이터에 중복 프로젝트가 있습니다.', 409)
    ids.add(project.id); slugs.add(project.slug)
  }
  return projects
}

async function safeDirectory(root, relative) {
  let current = root
  for (const part of relative.split('/')) {
    current = path.join(current, part)
    await mkdir(current).catch(error => { if (error.code !== 'EEXIST') throw error })
    const info = await lstat(current)
    if (!info.isDirectory() || info.isSymbolicLink()) throw new RegistrationError('저장 폴더에 심볼릭 링크나 잘못된 경로가 있습니다.', 409)
  }
  return current
}

function thumbnail(bytes) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdf-thumbnail-worker.mjs', import.meta.url), { workerData: bytes, resourceLimits: { maxOldGenerationSizeMb: 192 } })
    const timer = setTimeout(() => { void worker.terminate(); reject(new RegistrationError('PDF 처리 시간이 초과되었습니다. 더 작은 PDF로 다시 시도해 주세요.')) }, 40000)
    worker.once('message', result => {
      clearTimeout(timer)
      if (result.error) reject(new RegistrationError(result.error))
      else resolve(Buffer.from(result.webp))
    })
    worker.once('error', () => { clearTimeout(timer); reject(new RegistrationError('PDF를 처리하지 못했습니다. 파일을 확인해 주세요.')) })
    worker.once('exit', code => { clearTimeout(timer); if (code !== 0) reject(new RegistrationError('PDF 처리가 중단되었습니다. 파일을 확인해 주세요.')) })
  })
}

/** Both the CLI and dev API use this exclusive, staged transaction. */
export async function registerProject({ root = process.cwd(), input, pdfBytes, filename }) {
  const fields = normalizeInput(input)
  validatePdfBytes(pdfBytes, filename)
  root = await realpath(root)
  const lockPath = path.join(root, '.project-registration.lock')
  const lock = await open(lockPath, 'wx', 0o600).catch(error => {
    if (error.code === 'EEXIST') throw new RegistrationError('다른 등록 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.', 409)
    throw error
  })
  const created = []
  let stage, metadataTemp
  let committed = false
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }))
    const dataDir = await safeDirectory(root, 'src/data')
    const dataFile = path.join(dataDir, 'projects.json')
    if ((await lstat(dataFile)).isSymbolicLink()) throw new RegistrationError('프로젝트 데이터는 심볼릭 링크를 사용할 수 없습니다.', 409)
    const previous = await readFile(dataFile, 'utf8')
    const projects = await readProjectData(root)
    const slug = makeSlug(fields.title)
    if (projects.some(p => p.id === slug || p.slug === slug)) throw new RegistrationError('같은 제목의 프로젝트가 이미 있습니다. 제목을 구분되게 바꿔 주세요.', 409)
    const pdfDir = await safeDirectory(root, 'public/projects/pdfs')
    const thumbDir = await safeDirectory(root, 'public/projects/thumbnails')
    const finalPdf = path.join(pdfDir, `${slug}.pdf`)
    const finalThumb = path.join(thumbDir, `${slug}.webp`)
    for (const file of [finalPdf, finalThumb]) {
      if (await lstat(file).catch(error => { if (error.code !== 'ENOENT') throw error; return null })) throw new RegistrationError('같은 이름의 PDF 또는 썸네일이 있습니다. 기존 파일은 덮어쓰지 않았습니다.', 409)
    }
    // Parse and render before any public file is published.
    const webp = await thumbnail(pdfBytes)
    stage = await mkdtemp(path.join(root, '.project-registration-'))
    await writeFile(path.join(stage, 'document.pdf'), pdfBytes)
    await writeFile(path.join(stage, 'thumbnail.webp'), webp)
    const project = { id: slug, slug, ...fields, pdf: `projects/pdfs/${slug}.pdf`, thumbnail: `projects/thumbnails/${slug}.webp` }
    await validateProject(project, projects.length, false)
    const next = [...projects, project].sort((a, b) => b.date.localeCompare(a.date))
    metadataTemp = path.join(dataDir, `.projects-${path.basename(stage)}.tmp`)
    const metadata = await open(metadataTemp, 'wx', 0o600)
    try { await metadata.writeFile(`${JSON.stringify(next, null, 2)}\n`); await metadata.sync() } finally { await metadata.close() }
    // COPYFILE_EXCL closes the check/write race and never replaces existing assets.
    await copyFile(path.join(stage, 'document.pdf'), finalPdf, constants.COPYFILE_EXCL); created.push(finalPdf)
    await copyFile(path.join(stage, 'thumbnail.webp'), finalThumb, constants.COPYFILE_EXCL); created.push(finalThumb)
    if (await readFile(dataFile, 'utf8') !== previous) throw new RegistrationError('등록 중 데이터가 변경되었습니다. 새로고침 후 다시 시도해 주세요.', 409)
    await rename(metadataTemp, dataFile)
    committed = true
    return project
  } finally {
    // Attempt every cleanup even if one fails (for example after a permission change).
    const cleanup = await Promise.allSettled([
      ...(!committed ? created.map(file => unlink(file)) : []),
      ...(metadataTemp ? [unlink(metadataTemp).catch(error => { if (error.code !== 'ENOENT') throw error })] : []),
      ...(stage ? [rm(stage, { recursive: true, force: true })] : []),
    ])
    try { await lock.close() } finally { await unlink(lockPath) }
    if (cleanup.some(result => result.status === 'rejected')) console.warn('등록 임시 파일을 모두 정리하지 못했습니다. README의 중단된 작업 정리 안내를 확인해 주세요.')
  }
}
