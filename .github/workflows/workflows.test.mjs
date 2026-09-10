import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const read = (f) => readFile(path.join(DIR, f), 'utf-8')

test('build.yml is callable and needs no secrets', async () => {
  const src = await read('build.yml')
  assert.match(src, /workflow_call:/, 'must be reusable')
  assert.equal((src.match(/secrets\./g) ?? []).length, 0, 'this design has no secrets')
})

test('build.yml checks out the machinery at a literal tag, never a moving ref', async () => {
  const src = await read('build.yml')
  assert.match(src, /path: \.machinery/, 'the machinery is checked out separately')
  assert.match(src, /ref: v1/, 'pinned to the contract tag')
  assert.doesNotMatch(
    src,
    /ref: \$\{\{\s*github\.(ref|sha)/,
    'deriving the ref lets a caller pinned to @v1 run main'
  )
})

test('build.yml runs the generator from the machinery, not the caller repo', async () => {
  const src = await read('build.yml')
  assert.match(src, /node \.machinery\/scripts\/sync-projects\/index\.mjs/)
  assert.doesNotMatch(
    src,
    /run: node scripts\/sync-projects/,
    'an artist repo has no scripts/ in play'
  )
})

test('deploy.yml is a thin caller of the local build workflow', async () => {
  const src = await read('deploy.yml')
  assert.match(src, /uses: \.\/\.github\/workflows\/build\.yml/, 'the template dogfoods its own machinery')
  assert.ok(src.split('\n').length < 25, 'the caller must stay small enough to copy by hand')
})
