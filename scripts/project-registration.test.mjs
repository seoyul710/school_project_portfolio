import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PassThrough } from 'node:stream'
import { loadImage } from '@napi-rs/canvas'
import { MAX_PDF_BYTES, normalizeInput, registerProject, validatePdfBytes } from './project-store.mjs'
import { API_PATH, createProjectMiddleware, isTrustedRequest } from './local-project-api.mjs'
import { pdfFixture, projectInput } from './test-fixtures.mjs'

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-registration-test-'))
  await mkdir(path.join(root, 'src/data'), { recursive: true })
  await writeFile(path.join(root, 'src/data/projects.json'), '[]\n')
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}
const sourcePdf = pdfFixture()
const register = (root, input = projectInput, pdfBytes = sourcePdf) => registerProject({ root, input, pdfBytes, filename: '한글 공백 문서.pdf' })

test('shared store persists a readable PDF, WebP and metadata; duplicates never overwrite', async t => {
  const root = await workspace(t)
  const project = await register(root)
  assert.deepEqual(await readFile(path.join(root, 'public', project.pdf)), sourcePdf)
  const image = await loadImage(path.join(root, 'public', project.thumbnail))
  assert.ok(image.width > 0 && image.width <= 1100 && image.height <= 1400)
  const before = await readFile(path.join(root, 'src/data/projects.json'), 'utf8')
  assert.equal(JSON.parse(before)[0].title, projectInput.title)
  await assert.rejects(register(root), /이미 있습니다/)
  assert.equal(await readFile(path.join(root, 'src/data/projects.json'), 'utf8'), before)
  assert.equal((await readdir(root)).some(name => name.startsWith('.project-registration')), false)
})

test('unreadable PDF and colliding assets leave metadata and existing assets intact', async t => {
  const root = await workspace(t)
  await assert.rejects(register(root, projectInput, Buffer.from('%PDF-1.4\nnot a document')), /렌더링할 수 없습니다/)
  assert.equal(await readFile(path.join(root, 'src/data/projects.json'), 'utf8'), '[]\n')
  assert.deepEqual(await readdir(path.join(root, 'public/projects/pdfs')), [])
  const existing = path.join(root, 'public/projects/pdfs/검증용-프로젝트.pdf')
  await writeFile(existing, 'existing user file')
  await assert.rejects(register(root), /덮어쓰지 않았습니다/)
  assert.equal(await readFile(existing, 'utf8'), 'existing user file')
  assert.equal((await readdir(root)).some(name => name.startsWith('.project-registration')), false)
})

test('field, date, URL, extension and size validation is shared', () => {
  for (const input of [{ ...projectInput, title: '' }, { ...projectInput, date: '2026-02-31' }, { ...projectInput, tags: [] }, { ...projectInput, links: { github: 'not-a-url' } }]) assert.throws(() => normalizeInput(input))
  assert.throws(() => validatePdfBytes(sourcePdf, 'file.txt'), /PDF/)
  assert.throws(() => validatePdfBytes(Buffer.alloc(MAX_PDF_BYTES + 1), 'file.pdf'), /20MB/)
  assert.throws(() => validatePdfBytes(Buffer.from('not pdf'), 'file.pdf'), /올바르지/)
  assert.equal(normalizeInput({ ...projectInput, slug: 'ignored', pdf: 'ignored' }).slug, undefined)
})

test('symlinked write targets are rejected and concurrent registrations are serialized', async t => {
  const root = await workspace(t)
  const external = await mkdtemp(path.join(os.tmpdir(), 'portfolio-target-test-'))
  t.after(() => rm(external, { recursive: true, force: true }))
  await symlink(external, path.join(root, 'public'))
  await assert.rejects(register(root), /심볼릭 링크/)
  assert.deepEqual(await readdir(external), [])
  const normal = await workspace(t)
  const results = await Promise.allSettled([register(normal), register(normal, { ...projectInput, title: '두 번째 검증' })])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(JSON.parse(await readFile(path.join(normal, 'src/data/projects.json'), 'utf8')).length, 1)
})

function requestShape(overrides = {}) {
  return { method: 'GET', socket: { remoteAddress: '127.0.0.1', localPort: 5173 }, headers: { host: '127.0.0.1:5173', 'x-portfolio-request': 'local-registration' }, ...overrides }
}
test('API policy validates socket, Host, Origin, fetch metadata and custom header', () => {
  assert.equal(isTrustedRequest(requestShape()), true)
  assert.equal(isTrustedRequest(requestShape({ method: 'POST' })), false)
  assert.equal(isTrustedRequest(requestShape({ socket: { remoteAddress: '192.0.2.1', localPort: 5173 } })), false)
  for (const headers of [{ host: 'untrusted.invalid:5173' }, { origin: 'https://untrusted.invalid' }, { 'sec-fetch-site': 'cross-site' }, { 'x-portfolio-request': undefined }]) {
    assert.equal(isTrustedRequest(requestShape({ headers: { ...requestShape().headers, ...headers } })), false)
  }
})

async function invoke(middleware, method = 'GET', headers = {}, body) {
  const req = new PassThrough()
  Object.assign(req, requestShape(), { method, url: API_PATH, headers: { ...requestShape().headers, ...headers }, setTimeout() {} })
  let status, data
  const res = { writeHead(code) { status = code }, end(raw) { data = JSON.parse(raw) } }
  const result = middleware(req, res, () => { throw new Error('Unexpected fallback') })
  req.end(body)
  await result
  return { status, data }
}

test('multipart API saves on disk, rejects missing token, and survives a fresh middleware session', async t => {
  const root = await workspace(t)
  const middleware = createProjectMiddleware({ root })
  const capability = await invoke(middleware)
  assert.equal(capability.data.service, 'portfolio-local-registration')
  const form = new FormData()
  form.set('metadata', JSON.stringify(projectInput))
  form.set('pdf', new File([sourcePdf], '한글 문서.pdf', { type: 'application/pdf' }))
  const encoded = new Response(form)
  const body = Buffer.from(await encoded.arrayBuffer())
  const headers = { origin: 'http://127.0.0.1:5173', 'content-type': encoded.headers.get('content-type') }
  assert.equal((await invoke(middleware, 'POST', headers, body)).status, 403)
  const saved = await invoke(middleware, 'POST', { ...headers, 'x-portfolio-token': capability.data.token }, body)
  assert.equal(saved.status, 201)
  const restarted = await invoke(createProjectMiddleware({ root }))
  assert.equal(restarted.data.projects.length, 1)
  assert.notEqual(restarted.data.token, capability.data.token)
  assert.equal((await invoke(middleware, 'POST', { ...headers, 'x-portfolio-token': capability.data.token }, body)).status, 409)
})

test('interactive CLI uses the shared workflow with a Korean filename', async t => {
  const root = await workspace(t)
  const fixture = path.join(root, '검증 문서.pdf')
  await writeFile(fixture, sourcePdf)
  const child = spawn(process.execPath, [fileURLToPath(new URL('./add-project.mjs', import.meta.url))], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
  const prompts = ['Project title: ', 'Summary: ', 'Detailed description: ', 'Category: ', 'Date (YYYY, YYYY-MM, or YYYY-MM-DD): ', 'Tags (comma-separated): ', 'PDF path: ', 'GitHub URL (optional): ', 'External URL (optional): ']
  const answers = ['CLI 검증용', '테스트', '자동화 검증', '2', '2026-09', 'Python, Linux', fixture, '', '']
  let buffer = '', output = '', index = 0
  child.stdout.on('data', chunk => {
    output += chunk; buffer += chunk
    if (index < prompts.length && buffer.includes(prompts[index])) {
      buffer = buffer.slice(buffer.indexOf(prompts[index]) + prompts[index].length)
      child.stdin.write(`${answers[index++]}\n`)
    }
  })
  child.stderr.on('data', chunk => { output += chunk })
  const timer = setTimeout(() => child.kill(), 45000)
  const code = await new Promise(resolve => child.once('exit', resolve))
  clearTimeout(timer)
  assert.equal(code, 0, output)
  assert.match(output, /Thumbnail generated/)
  assert.equal(JSON.parse(await readFile(path.join(root, 'src/data/projects.json'), 'utf8'))[0].category, '팀 프로젝트')
})
