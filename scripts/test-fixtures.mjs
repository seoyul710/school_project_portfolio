// Deterministic PDF used only inside temporary test directories, never public/.
export function pdfFixture(size, { image = false } = {}) {
  const content = image ? 'q 520 0 0 700 40 50 cm /Im1 Do Q' : 'BT /F1 24 Tf 40 700 Td (TEST ONLY - FIRST PAGE) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> ${image ? '/XObject << /Im1 6 0 R >>' : ''} >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  if (image) {
    const pixels = `${'224466ffcc88'.repeat(128 * 256)}>`
    objects.push(`<< /Type /XObject /Subtype /Image /Width 256 /Height 256 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${pixels.length} >>\nstream\n${pixels}\nendstream`)
  }
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const head = Buffer.from(pdf)
  const trailer = xref => Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    + offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  if (size === undefined) return Buffer.concat([head, trailer(head.length)])
  // Legal whitespace before the cross-reference table gives an exact-size,
  // readable PDF without adding work to first-page rendering.
  let padding = size - head.length - trailer(head.length).length
  while (padding >= 0) {
    const tail = trailer(head.length + padding)
    const difference = size - head.length - padding - tail.length
    if (!difference) return Buffer.concat([head, Buffer.alloc(padding, 0x20), tail])
    padding += difference
  }
  throw new Error('Requested PDF fixture size is too small')
}

export const projectInput = { title: '검증용 프로젝트', summary: '테스트 전용 요약', description: '실제 활동이 아닌 자동화 검증 데이터입니다.', category: 'Security', date: '2026-09-08', tags: ['Python', 'Linux'] }
