import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { MAX_PDF_BYTES, RegistrationError, readProjectData, registerProject } from './project-store.mjs'

export const API_PATH = '/__portfolio/projects'
const REQUEST_MARKER = 'local-registration'
const MAX_BODY_BYTES = MAX_PDF_BYTES + 64 * 1024
const loopback = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)

/** Reject before reading any body. No forwarded headers or hostname heuristics. */
export function isTrustedRequest(req) {
  if (!loopback(req.socket.remoteAddress)) return false
  const protocol = req.socket.encrypted ? 'https:' : 'http:'
  const hosts = ['localhost', '127.0.0.1', '[::1]']
  const port = req.socket.localPort
  const authorities = hosts.map(host => `${host}:${port}`)
  if (port === (protocol === 'https:' ? 443 : 80)) authorities.push(...hosts)
  if (!authorities.includes(req.headers.host)) return false
  if (req.headers['x-portfolio-request'] !== REQUEST_MARKER) return false
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return false
  const expected = `${protocol}//${req.headers.host}`
  if (req.method === 'POST') return req.headers.origin === expected
  return !req.headers.origin || req.headers.origin === expected
}

function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' })
  res.end(JSON.stringify(data))
}

async function readBody(req) {
  if (req.headers['content-encoding']) throw new RegistrationError('압축된 업로드는 지원하지 않습니다.')
  const contentType = req.headers['content-type'] || ''
  if (!contentType.startsWith('multipart/form-data;')) throw new RegistrationError('PDF 파일과 등록 폼을 함께 보내 주세요.')
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) throw new RegistrationError('PDF는 100MB 이하여야 합니다.', 413)
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new RegistrationError('PDF는 100MB 이하여야 합니다.', 413)
    chunks.push(chunk)
  }
  try {
    return await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': contentType } }).formData()
  } catch { throw new RegistrationError('업로드 형식이 올바르지 않습니다. 파일을 다시 선택해 주세요.') }
}

export function createProjectMiddleware({ root }) {
  // Session secret is never embedded in source, Vite env, logs, or production output.
  const token = randomBytes(32).toString('hex')
  let busy = false
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== API_PATH) return next()
    if (!isTrustedRequest(req)) return reply(res, 403, { error: '이 로컬 개발 서버의 같은 출처에서만 등록할 수 있습니다.' })
    if (req.method === 'GET') {
      try { return reply(res, 200, { service: 'portfolio-local-registration', version: 1, token, maxPdfBytes: MAX_PDF_BYTES, projects: await readProjectData(root) }) }
      catch { return reply(res, 409, { error: '기존 프로젝트 데이터를 읽을 수 없습니다. 데이터 파일을 확인해 주세요.' }) }
    }
    if (req.method !== 'POST') return reply(res, 405, { error: '지원하지 않는 요청입니다.' })
    const provided = req.headers['x-portfolio-token']
    if (typeof provided !== 'string' || !/^[a-f0-9]{64}$/.test(provided) || !timingSafeEqual(Buffer.from(provided), Buffer.from(token))) return reply(res, 403, { error: '등록 연결이 만료되었습니다. 폼을 닫고 다시 열어 주세요.' })
    if (busy) return reply(res, 409, { error: '다른 등록 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.' })
    busy = true
    const onTimeout = () => req.destroy()
    req.once('timeout', onTimeout)
    req.setTimeout(30000)
    try {
      const form = await readBody(req)
      req.setTimeout(0)
      if ([...form.keys()].some(key => key !== 'metadata' && key !== 'pdf') || form.getAll('metadata').length !== 1 || form.getAll('pdf').length !== 1) throw new RegistrationError('등록 폼의 항목을 확인해 주세요.')
      const metadata = form.get('metadata')
      const file = form.get('pdf')
      if (typeof metadata !== 'string' || metadata.length > 30000) throw new RegistrationError('프로젝트 설명이 너무 길거나 입력 형식이 올바르지 않습니다.')
      if (!(file instanceof File)) throw new RegistrationError('PDF 파일을 선택해 주세요.')
      if (!file.size || file.size > MAX_PDF_BYTES) throw new RegistrationError('PDF는 0바이트보다 크고 100MB 이하여야 합니다.', 413)
      let input
      try { input = JSON.parse(metadata) } catch { throw new RegistrationError('프로젝트 입력 형식이 올바르지 않습니다.') }
      const project = await registerProject({ root, input, filename: file.name, pdfBytes: Buffer.from(await file.arrayBuffer()) })
      return reply(res, 201, { project })
    } catch (error) {
      return reply(res, error instanceof RegistrationError ? error.status : 500, { error: error instanceof RegistrationError ? error.message : '저장하지 못했습니다. 폴더 권한과 프로젝트 데이터 파일을 확인해 주세요.' })
    } finally { req.removeListener('timeout', onTimeout); req.setTimeout(0); busy = false }
  }
}

/** @returns {import('vite').Plugin} */
export function localProjectsPlugin() {
  return {
    name: 'portfolio-local-registration',
    apply: 'serve',
    configureServer(server) {
      // Newly committed assets must work immediately, independent of watcher timing
      // and macOS filename normalization in Vite's cached public-file inventory.
      server.middlewares.use(async (req, res, next) => {
        if (!['GET', 'HEAD'].includes(req.method) || !req.url?.startsWith('/projects/')) return next()
        try {
          const urlPath = decodeURIComponent(req.url.split('?')[0])
          const projects = await readProjectData(server.config.root)
          const asset = projects.flatMap(project => [project.pdf, project.thumbnail]).find(file => `/${file}` === urlPath)
          if (!asset) return next()
          const publicRoot = await realpath(path.join(server.config.root, 'public'))
          const filename = await realpath(path.resolve(publicRoot, asset))
          if (!filename.startsWith(`${publicRoot}${path.sep}`)) return next()
          const bytes = await readFile(filename)
          res.writeHead(200, { 'Content-Type': asset.endsWith('.pdf') ? 'application/pdf' : 'image/webp', 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
          res.end(req.method === 'HEAD' ? undefined : bytes)
        } catch { next() }
      })
      server.middlewares.use(createProjectMiddleware({ root: server.config.root }))
    },
  }
}
