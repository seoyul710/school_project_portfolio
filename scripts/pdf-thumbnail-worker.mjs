import { readFile, writeFile } from 'node:fs/promises'
import * as canvasModule from '@napi-rs/canvas'

globalThis.DOMMatrix ??= canvasModule.DOMMatrix
globalThis.ImageData ??= canvasModule.ImageData
globalThis.Path2D ??= canvasModule.Path2D

let task
try {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const bytes = await readFile(process.argv[2])
  task = pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: true, isEvalSupported: false, stopAtErrors: true })
  const document = await task.promise
  const page = await document.getPage(1)
  const initial = page.getViewport({ scale: 1 })
  if (![initial.width, initial.height].every(n => Number.isFinite(n) && n > 0)) throw new Error('dimensions')
  const scale = Math.min(1.7, 1100 / initial.width, 1400 / initial.height)
  const viewport = page.getViewport({ scale })
  const canvas = canvasModule.createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)))
  await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' }).promise
  await writeFile(process.argv[3], await canvas.encode('webp', 82))
} catch {
  process.exitCode = 1
} finally {
  await task?.destroy()
}
