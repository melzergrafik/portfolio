import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { sortProjects } from './sort.mjs'

test('sorts by year descending', () => {
  const out = sortProjects([
    { metadata: { year: '2023', publishedAt: '2023-01-01' } },
    { metadata: { year: '2025', publishedAt: '2025-01-01' } },
    { metadata: { year: '2024', publishedAt: '2024-01-01' } },
  ])
  assert.deepEqual(out.map((p) => p.metadata.year), ['2025', '2024', '2023'])
})

test('breaks year ties with publishedAt descending', () => {
  const out = sortProjects([
    { metadata: { year: '2025', publishedAt: '2025-03-01' } },
    { metadata: { year: '2025', publishedAt: '2025-09-01' } },
  ])
  assert.deepEqual(
    out.map((p) => p.metadata.publishedAt),
    ['2025-09-01', '2025-03-01']
  )
})

test('projects without a year sort last', () => {
  const out = sortProjects([
    { metadata: { year: '', publishedAt: '' } },
    { metadata: { year: '2020', publishedAt: '2020-01-01' } },
  ])
  assert.deepEqual(out.map((p) => p.metadata.year), ['2020', ''])
})

test('getUsage survives a missing, empty or corrupt usage.json', async () => {
  // It is a generated file, so a fresh clone can legitimately not have it yet.
  // Crashing here takes down the whole static export with an opaque JSON error
  // rather than the one page that shows the number.
  const { getUsage } = await import('./utils.ts')
  const file = path.join(process.cwd(), 'app', 'usage.json')
  const saved = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null

  try {
    for (const content of ['', '   ', '{ broken', 'null']) {
      fs.writeFileSync(file, content)
      const usage = getUsage()
      assert.equal(typeof usage.bytes, 'number', `bytes must be a number for ${JSON.stringify(content)}`)
      assert.equal(typeof usage.limit, 'number')
      assert.equal(typeof usage.pct, 'number')
    }
    fs.rmSync(file)
    assert.equal(getUsage().bytes, 0, 'a missing file reads as zero usage')
  } finally {
    if (saved === null) fs.rmSync(file, { force: true })
    else fs.writeFileSync(file, saved)
  }
})
