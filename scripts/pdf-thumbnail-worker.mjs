import { parentPort, workerData } from 'node:worker_threads'
import * as canvasModule from '@napi-rs/canvas'

globalThis.DOMMatrix ??= canvasModule.DOMMatrix
globalThis.ImageData ??= canvasModule.ImageData
globalThis.Path2D ??= canvasModule.Path2D

let task
try {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  task = pdfjs.getDocument({ data: new Uint8Array(workerData), disableFontFace: true, useSystemFonts: true, isEvalSupported: false, stopAtErrors: true })
  const document = await task.promise
  const page = await document.getPage(1)
  const initial = page.getViewport({ scale: 1 })
  if (![initial.width, initial.height].every(n => Number.isFinite(n) && n > 0)) throw new Error('dimensions')
  const scale = Math.min(1.7, 1100 / initial.width, 1400 / initial.height)
  const viewport = page.getViewport({ scale })
  const canvas = canvasModule.createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)))
  await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' }).promise
  parentPort.postMessage({ webp: await canvas.encode('webp', 82) })
} catch {
  parentPort.postMessage({ error: 'PDF를 읽거나 첫 페이지를 렌더링할 수 없습니다. 손상되거나 암호가 설정된 PDF인지 확인해 주세요.' })
} finally {
  await task?.destroy()
  parentPort.close()
}
