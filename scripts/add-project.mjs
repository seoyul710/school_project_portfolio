import { readFile, stat } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { categories, isValidDate, isValidUrl } from './project-utils.mjs'
import { MAX_PDF_BYTES, registerProject } from './project-store.mjs'

const rl = createInterface({ input, output })
async function ask(label, { required = true, validate } = {}) {
  while (true) {
    const value = (await rl.question(`${label}: `)).trim()
    if (!value && !required) return ''
    if (!value) { console.log('  필수 항목입니다. 값을 입력해 주세요.'); continue }
    const message = validate?.(value)
    if (message) { console.log(`  ${message}`); continue }
    return value
  }
}

try {
  console.log('\n새 프로젝트 등록\n')
  const title = await ask('Project title')
  const summary = await ask('Summary')
  const description = await ask('Detailed description')
  console.log('\nCategory를 선택하거나 직접 입력하세요.')
  categories.forEach((item, index) => console.log(`  ${index + 1}. ${item}`))
  const categoryInput = await ask('Category')
  const category = categories[Number(categoryInput) - 1] || categoryInput
  const date = await ask('Date (YYYY, YYYY-MM, or YYYY-MM-DD)', { validate: value => isValidDate(value) ? undefined : '날짜 형식을 확인해 주세요.' })
  const tags = (await ask('Tags (comma-separated)')).split(',').map(tag => tag.trim()).filter(Boolean)
  // Quoted paths are common when a file is dragged into the terminal.
  const filename = (await ask('PDF path')).replace(/^(["'])(.*)\1$/, '$2').replace(/\\ /g, ' ')
  const github = await ask('GitHub URL (optional)', { required: false, validate: value => isValidUrl(value) ? undefined : 'http 또는 https URL을 입력해 주세요.' })
  const external = await ask('External URL (optional)', { required: false, validate: value => isValidUrl(value) ? undefined : 'http 또는 https URL을 입력해 주세요.' })
  const file = await stat(filename).catch(() => null)
  if (!file?.isFile()) throw new Error('PDF 파일을 찾을 수 없습니다. 경로를 확인해 주세요.')
  if (file.size > MAX_PDF_BYTES) throw new Error('PDF는 20MB 이하여야 합니다.')
  await registerProject({ input: { title, summary, description, category, date, tags, links: { github, external } }, filename, pdfBytes: await readFile(filename) })
  console.log('\n✓ PDF copied\n✓ Thumbnail generated\n✓ Metadata created')
  console.log(`✓ Project added: ${title}`)
} catch (error) {
  console.error(`\n✗ 등록 실패: ${error.message}`)
  process.exitCode = 1
} finally { rl.close() }
