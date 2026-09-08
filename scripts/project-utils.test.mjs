import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidDate, isValidUrl, makeSlug, validateProject } from './project-utils.mjs'

test('date validation accepts documented formats and rejects impossible dates', () => {
  assert.equal(isValidDate('2026'), true)
  assert.equal(isValidDate('2026-08'), true)
  assert.equal(isValidDate('2024-02-29'), true)
  assert.equal(isValidDate('2026-13'), false)
  assert.equal(isValidDate('2026-02-31'), false)
})

test('slug generation safely handles Korean and spaces', () => {
  assert.equal(makeSlug('  커버리지 기반 퍼징 분석  '), '커버리지-기반-퍼징-분석')
  assert.equal(makeSlug('Web / Security Project'), 'web-security-project')
})

test('URLs only allow HTTP and HTTPS', () => {
  assert.equal(isValidUrl(''), true)
  assert.equal(isValidUrl('https://github.com/example/project'), true)
  assert.equal(isValidUrl('javascript:alert(1)'), false)
  assert.equal(isValidUrl('not-a-url'), false)
})

test('project validation reports missing required values', async () => {
  await assert.rejects(
    validateProject({ id: 'sample', slug: 'sample', title: '', tags: [] }, 0, false),
    /title 값이 비어 있습니다/,
  )
})
