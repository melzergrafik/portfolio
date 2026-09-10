import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname)

test('scripts/ imports nothing from app/ and nothing Next-specific', async () => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mjs'))
  for (const file of files) {
    const src = await readFile(path.join(DIR, file), 'utf-8')
    const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
    for (const spec of imports) {
      assert.ok(
        !spec.startsWith('app/') && !spec.includes('/app/'),
        `${file} imports from app/: ${spec}`
      )
      assert.ok(
        !spec.startsWith('next'),
        `${file} imports Next-specific module: ${spec}`
      )
    }
  }
})

test('loadConfig resolves every path from the cwd, with defaults', async () => {
  const { loadConfig } = await import('./config.mjs')
  for (const v of [
    'SOURCE_DIR',
    'PUBLIC_DIR',
    'CONTENT_DIR',
    'USAGE_FILE',
    'ABOUT_FILE',
    'PUBLIC_BASE',
  ]) {
    delete process.env[v]
  }

  const config = loadConfig()
  assert.equal(config.sourceDir, path.join(process.cwd(), 'content'))
  assert.equal(config.publicDir, path.join(process.cwd(), 'public'))
  assert.equal(config.contentDir, path.join(process.cwd(), 'app/projects/items'))
  assert.equal(config.usageFile, path.join(process.cwd(), 'app/usage.json'))
  assert.equal(config.aboutFile, path.join(process.cwd(), 'app/about.mdx'))
  // Derivatives are served from the site's own origin, so URLs are root-relative.
  assert.equal(config.publicBase, '')

  process.env.CONTENT_DIR = 'content/work'
  assert.equal(loadConfig().contentDir, path.join(process.cwd(), 'content/work'))
  delete process.env.CONTENT_DIR

  process.env.PUBLIC_BASE = 'https://example.dev/'
  assert.equal(loadConfig().publicBase, 'https://example.dev', 'trailing slash trimmed')
  delete process.env.PUBLIC_BASE
})

test('loadConfig needs no credentials — nothing in this design has any', async () => {
  const { loadConfig } = await import('./config.mjs')
  const src = await readFile(new URL('./config.mjs', import.meta.url), 'utf-8')
  assert.doesNotMatch(src, /R2_|AWS_|SECRET|TOKEN|PASSWORD/i)
  assert.doesNotThrow(() => loadConfig(), 'a bare checkout must configure itself')
})
