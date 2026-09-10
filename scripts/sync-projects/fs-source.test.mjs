import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  listProjectFolders,
  listFolderObjects,
  readObjectBytes,
  readObjectText,
  writeObject,
} from './fs-source.mjs'

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'fs-source-'))
  await mkdir(path.join(root, 'lit-2024'), { recursive: true })
  await mkdir(path.join(root, '_about'), { recursive: true })
  await mkdir(path.join(root, '_web/lit-2024'), { recursive: true })
  await writeFile(path.join(root, 'lit-2024/info.md'), 'title: Lit\n')
  await writeFile(path.join(root, 'lit-2024/one.jpg'), 'AAAA')
  await writeFile(path.join(root, '_about/info.md'), 'name: Dave\n')
  await writeFile(path.join(root, 'loose.txt'), 'not a folder')
  return root
}

test('listProjectFolders returns directories as prefixes, sorted, files excluded', async () => {
  const root = await fixture()
  assert.deepEqual(await listProjectFolders(root), ['_about/', '_web/', 'lit-2024/'])
})

test('listProjectFolders returns [] for a missing directory', async () => {
  assert.deepEqual(await listProjectFolders('/no/such/dir'), [])
})

test('listFolderObjects returns posix keys, sizes and hashes', async () => {
  const root = await fixture()
  const objects = await listFolderObjects(root, 'lit-2024/')
  assert.deepEqual(
    objects.map((o) => o.key).sort(),
    ['lit-2024/info.md', 'lit-2024/one.jpg']
  )
  const jpg = objects.find((o) => o.key === 'lit-2024/one.jpg')
  assert.equal(jpg.size, 4)
  assert.match(jpg.hash, /^[0-9a-f]{8}$/)
})

test('listFolderObjects recurses into nested directories', async () => {
  const root = await fixture()
  await mkdir(path.join(root, 'lit-2024/detail'), { recursive: true })
  await writeFile(path.join(root, 'lit-2024/detail/two.jpg'), 'BB')
  const keys = (await listFolderObjects(root, 'lit-2024/')).map((o) => o.key)
  assert.ok(keys.includes('lit-2024/detail/two.jpg'), 'nested file is listed with a posix key')
})

test('listFolderObjects with an empty prefix walks the whole tree', async () => {
  const root = await fixture()
  const keys = (await listFolderObjects(root, '')).map((o) => o.key)
  assert.ok(keys.includes('loose.txt'))
  assert.ok(keys.includes('_about/info.md'))
})

test('listFolderObjects returns [] for a missing prefix', async () => {
  const root = await fixture()
  assert.deepEqual(await listFolderObjects(root, 'nope/'), [])
})

test('hash is stable across calls and changes with the bytes', async () => {
  const root = await fixture()
  const first = (await listFolderObjects(root, 'lit-2024/')).find((o) => o.key.endsWith('one.jpg'))
  const again = (await listFolderObjects(root, 'lit-2024/')).find((o) => o.key.endsWith('one.jpg'))
  assert.equal(first.hash, again.hash, 'unchanged bytes must keep the same hash')

  await writeFile(path.join(root, 'lit-2024/one.jpg'), 'BBBB')
  const changed = (await listFolderObjects(root, 'lit-2024/')).find((o) => o.key.endsWith('one.jpg'))
  assert.notEqual(first.hash, changed.hash, 'changed bytes must yield a new hash')
  assert.equal(changed.size, 4, 'same size, different content — size alone must not key the cache')
})

test('readObjectBytes and readObjectText round-trip', async () => {
  const root = await fixture()
  assert.ok((await readObjectBytes(root, 'lit-2024/one.jpg')).equals(Buffer.from('AAAA')))
  assert.equal(await readObjectText(root, '_about/info.md'), 'name: Dave\n')
})

test('writeObject creates missing parent directories', async () => {
  const root = await fixture()
  await writeObject(root, '_web/deep/nested/x-abc-640.avif', Buffer.from('OK'))
  assert.equal(
    await readFile(path.join(root, '_web/deep/nested/x-abc-640.avif'), 'utf-8'),
    'OK'
  )
})
