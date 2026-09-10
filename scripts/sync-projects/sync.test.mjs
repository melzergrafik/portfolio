import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { main } from './index.mjs'

// The orchestration test. Every defect this file has had — a cost guard skipped
// on an early return, a portrait re-encoded on every run, derivatives orphaned
// forever — lived in the wiring between correct parts, so unit tests could not
// see any of them.

let root
const ENV = ['SOURCE_DIR', 'PUBLIC_DIR', 'CONTENT_DIR', 'USAGE_FILE', 'ABOUT_FILE', 'PUBLIC_BASE']
let quiet

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'sync-'))
  process.env.SOURCE_DIR = path.join(root, 'content')
  process.env.PUBLIC_DIR = path.join(root, 'public')
  process.env.CONTENT_DIR = path.join(root, 'items')
  process.env.USAGE_FILE = path.join(root, 'usage.json')
  process.env.ABOUT_FILE = path.join(root, 'about.mdx')
  delete process.env.PUBLIC_BASE
  await mkdir(process.env.SOURCE_DIR, { recursive: true })
  quiet = [console.log, console.warn]
  console.log = () => {}
  console.warn = () => {}
})

afterEach(async () => {
  ;[console.log, console.warn] = quiet
  for (const v of ENV) delete process.env[v]
  await rm(root, { recursive: true, force: true })
})

const src = (...p) => path.join(process.env.SOURCE_DIR, ...p)
const web = (...p) => path.join(process.env.PUBLIC_DIR, '_web', ...p)

async function image(file, { width = 1000, height = 800, avif = false, colour = '#456' } = {}) {
  await mkdir(path.dirname(file), { recursive: true })
  const img = sharp({ create: { width, height, channels: 3, background: colour } })
  await (avif ? img.avif({ quality: 70 }) : img.jpeg()).toFile(file)
}

const listWeb = async () =>
  (await readdir(web(), { recursive: true }).catch(() => []))
    .filter((f) => f.endsWith('.avif'))
    .sort()

test('a project folder becomes an mdx file with srcsets', async () => {
  await image(src('blue-hour', 'one.jpg'))
  await writeFile(src('blue-hour', 'info.md'), '---\ntitle: Blue Hour\nyear: 2026\nsummary: A series.\n---\nBody.\n')
  await main()

  const mdx = await readFile(path.join(process.env.CONTENT_DIR, 'blue-hour.mdx'), 'utf-8')
  assert.match(mdx, /title: 'Blue Hour'/)
  assert.match(mdx, /year: '2026'/)
  assert.match(mdx, /srcset: '[^']*640w[^']*1000w'/)
  assert.match(mdx, /Body\./)
  // Never invent alt text for someone's artwork.
  assert.match(mdx, /alt: ''/)
})

test('a second run with unchanged content re-encodes nothing', async () => {
  await image(src('blue-hour', 'one.jpg'))
  await main()
  const first = await Promise.all(
    (await listWeb()).map(async (f) => [f, (await stat(web(f))).mtimeMs])
  )
  assert.ok(first.length > 0, 'the first run must produce derivatives')

  await main()
  const second = await Promise.all(
    (await listWeb()).map(async (f) => [f, (await stat(web(f))).mtimeMs])
  )
  assert.deepEqual(second, first, 'no derivative may be rewritten on an unchanged run')
})

test('changing a source prunes the derivatives of the old one', async () => {
  await image(src('blue-hour', 'one.jpg'))
  await main()
  const before = await listWeb()
  assert.ok(before.length >= 2)

  await image(src('blue-hour', 'one.jpg'), { colour: '#a31' })
  await main()
  const after = await listWeb()

  assert.equal(after.length, before.length, 'the old variants must not accumulate')
  assert.equal(
    after.filter((f) => before.includes(f)).length,
    0,
    'every derivative is content-addressed, so all of them are new'
  )
})

test('deleting a project prunes its derivatives entirely', async () => {
  await image(src('blue-hour', 'one.jpg'))
  await main()
  assert.ok((await listWeb()).length > 0)

  await rm(src('blue-hour'), { recursive: true })
  await main()
  assert.deepEqual(await listWeb(), [], 'an orphaned folder leaves nothing behind')
})

test('an AVIF source is copied through untouched at its native width', async () => {
  await image(src('blue-hour', 'one.avif'), { width: 900, height: 600, avif: true })
  await main()
  const source = await readFile(src('blue-hour', 'one.avif'))
  const native = (await listWeb()).find((f) => f.endsWith('-900.avif'))
  assert.ok(native, 'a variant at the native width must exist')
  assert.ok(
    (await readFile(web(native))).equals(source),
    'quality is the product — the widest variant must not be re-encoded'
  )
})

test('underscore folders are never published as projects', async () => {
  await image(src('_about', 'portrait.jpg'))
  await writeFile(src('_about', 'info.md'), '---\nname: Dave\ntagline: Painter\n---\nBio.\n')
  await image(src('real', 'one.jpg'))
  await main()

  const items = await readdir(process.env.CONTENT_DIR)
  assert.deepEqual(items, ['real.mdx'], '_about must not become a project page')

  const about = await readFile(process.env.ABOUT_FILE, 'utf-8')
  assert.match(about, /name: 'Dave'/)
  assert.match(about, /Bio\./)
  assert.match(about, /portraitSrcset:/)
})

test('a folder with no images is skipped rather than published empty', async () => {
  await mkdir(src('empty'), { recursive: true })
  await writeFile(src('empty', 'info.md'), '---\ntitle: Empty\n---\n')
  await image(src('real', 'one.jpg'))
  await main()
  assert.deepEqual(await readdir(process.env.CONTENT_DIR), ['real.mdx'])
})

test('usage.json is written even when there are no projects at all', async () => {
  // A new artist has an empty content/. An early return here once skipped the
  // about build and the size report entirely.
  await writeFile(await mkdir(src('_about'), { recursive: true }).then(() => src('_about', 'info.md')),
    '---\nname: Dave\n---\nBio.\n')
  await main()

  const usage = JSON.parse(await readFile(process.env.USAGE_FILE, 'utf-8'))
  assert.equal(typeof usage.bytes, 'number')
  assert.equal(typeof usage.pct, 'number')
  assert.equal(usage.overWarn, false)
  assert.ok(usage.generatedAt, 'the report must be timestamped')

  const about = await readFile(process.env.ABOUT_FILE, 'utf-8')
  assert.match(about, /name: 'Dave'/, 'about must still be built with zero projects')
})

test('PUBLIC_BASE prefixes every generated URL, for project sites', async () => {
  process.env.PUBLIC_BASE = '/portfolio'
  await image(src('blue-hour', 'one.jpg'))
  await main()
  const mdx = await readFile(path.join(process.env.CONTENT_DIR, 'blue-hour.mdx'), 'utf-8')
  assert.match(mdx, /src: '\/portfolio\/_web\//)
  assert.doesNotMatch(mdx, /'\/_web\//, 'no URL may escape the base path')
})
