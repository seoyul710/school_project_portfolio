import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { loadImage } from '@napi-rs/canvas'
import { createServer } from 'vite'
import { pdfFixture, projectInput } from './test-fixtures.mjs'

const sourceRoot = fileURLToPath(new URL('../', import.meta.url))
const maxBytes = 100 * 1024 * 1024
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

test('Vite serves 100MB uploads and reloads changes to the server limit', { timeout: 60000 }, async t => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'portfolio-server-test-')))
  let server
  t.after(async () => {
    try { await server?.close() } finally { await rm(root, { recursive: true, force: true }) }
  })
  await mkdir(path.join(root, 'scripts'))
  await mkdir(path.join(root, 'src/data'), { recursive: true })
  await writeFile(path.join(root, 'src/data/projects.json'), '[]\n')
  await symlink(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'))
  for (const file of ['vite.config.ts', 'package.json', 'scripts/local-project-api.mjs', 'scripts/project-store.mjs', 'scripts/project-utils.mjs', 'scripts/pdf-thumbnail-worker.mjs']) {
    await copyFile(path.join(sourceRoot, file), path.join(root, file))
  }
  server = await createServer({ root, logLevel: 'silent', server: { port: 0, ws: false }, optimizeDeps: { noDiscovery: true, entries: [] } })
  await server.listen()
  const apiUrl = () => `http://127.0.0.1:${server.httpServer.address().port}/__portfolio/projects`
  const marker = { 'X-Portfolio-Request': 'local-registration' }
  const capability = async () => {
    const response = await fetch(apiUrl(), { headers: marker })
    assert.equal(response.status, 200)
    return response.json()
  }
  let session = await capability()
  assert.equal(session.maxPdfBytes, maxBytes)
  const headers = () => ({ ...marker, Origin: new URL(apiUrl()).origin, 'X-Portfolio-Token': session.token })

  await t.test('an exact 100MB multipart upload saves the full PDF and a readable thumbnail', async () => {
    const pdf = pdfFixture(maxBytes, { image: true })
    const expectedHash = digest(pdf)
    const form = new FormData()
    form.set('metadata', JSON.stringify(projectInput))
    form.set('pdf', new File([pdf], '100MB 검증.pdf', { type: 'application/pdf' }))
    const response = await fetch(apiUrl(), { method: 'POST', headers: headers(), body: form })
    const result = await response.json()
    assert.equal(response.status, 201, JSON.stringify(result))
    const saved = path.join(root, 'public', result.project.pdf)
    assert.equal((await stat(saved)).size, maxBytes)
    assert.equal(digest(await readFile(saved)), expectedHash)
    const image = await loadImage(path.join(root, 'public', result.project.thumbnail))
    assert.ok(image.width > 0 && image.height > 0)
    assert.equal((await capability()).projects.length, 1)
  })

  await t.test('100MB plus one byte is rejected after parsing multipart without changing metadata', async () => {
    const before = await readFile(path.join(root, 'src/data/projects.json'), 'utf8')
    const form = new FormData()
    form.set('metadata', JSON.stringify({ ...projectInput, title: '초과 용량 검증' }))
    form.set('pdf', new File([pdfFixture(maxBytes + 1)], 'too-large.pdf', { type: 'application/pdf' }))
    const response = await fetch(apiUrl(), { method: 'POST', headers: headers(), body: form })
    assert.equal(response.status, 413)
    assert.match((await response.json()).error, /100MB/)
    assert.equal(await readFile(path.join(root, 'src/data/projects.json'), 'utf8'), before)
  })

  await t.test('a renderer process crash returns JSON, cleans up, and allows the next upload', async () => {
    const workerPath = path.join(root, 'scripts/pdf-thumbnail-worker.mjs')
    const worker = await readFile(workerPath, 'utf8')
    const dataPath = path.join(root, 'src/data/projects.json')
    const before = await readFile(dataPath, 'utf8')
    await writeFile(workerPath, "process.kill(process.pid, 'SIGKILL')\n")
    const upload = async () => {
      const form = new FormData()
      form.set('metadata', JSON.stringify({ ...projectInput, title: '충돌 후 복구 검증' }))
      form.set('pdf', new File([pdfFixture(undefined, { image: true })], 'image.pdf', { type: 'application/pdf' }))
      return fetch(apiUrl(), { method: 'POST', headers: headers(), body: form })
    }
    try {
      const failed = await upload()
      assert.equal(failed.status, 400)
      assert.match((await failed.json()).error, /PDF 이미지 처리 중 오류/)
      assert.equal((await capability()).token, session.token)
      assert.equal(await readFile(dataPath, 'utf8'), before)
      await assert.rejects(stat(path.join(root, '.project-registration.lock')), { code: 'ENOENT' })
    } finally { await writeFile(workerPath, worker) }
    const recovered = await upload()
    assert.equal(recovered.status, 201, await recovered.text())
    assert.equal((await capability()).projects.length, 2)
  })

  await t.test('editing the store automatically restarts Vite and refreshes the loaded module', async () => {
    const storePath = path.join(root, 'scripts/project-store.mjs')
    assert.ok(server.config.configFileDependencies.includes(storePath))
    const original = await readFile(storePath, 'utf8')
    await writeFile(storePath, original.replace('100 * 1024 * 1024', '99 * 1024 * 1024'))
    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      await delay(100)
      try { session = await capability() } catch { continue }
      if (session.maxPdfBytes === 99 * 1024 * 1024) break
    }
    assert.equal(session.maxPdfBytes, 99 * 1024 * 1024)
  })
})
