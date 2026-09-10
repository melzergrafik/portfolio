import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

// The filesystem replacement for r2.mjs. Keys are posix-style and relative to
// the root directory, which is the shape the rest of the generator already
// speaks — so swapping the source swaps nothing else.

const toKey = (p) => p.split(path.sep).join('/')

export async function listProjectFolders(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => `${e.name}/`)
    .sort()
}

// 8 hex chars of sha256 over the file's bytes. It has to be a *content* hash:
// git does not preserve mtimes, so every CI checkout gets fresh ones and an
// mtime-keyed name would miss the derivative cache on every single run.
async function hashFile(file) {
  const hash = createHash('sha256')
  hash.update(await readFile(file))
  return hash.digest('hex').slice(0, 8)
}

// `hash: false` skips the content hash, which costs a full read of every file.
// Only source images need one (it keys their derivative names); the derivative
// and usage listings just need keys and sizes.
export async function listFolderObjects(root, prefix, { hash = true } = {}) {
  const base = path.join(root, prefix)
  const objects = []
  const entries = await readdir(base, {
    withFileTypes: true,
    recursive: true,
  }).catch(() => [])

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const abs = path.join(entry.parentPath ?? entry.path, entry.name)
    const key = toKey(path.relative(root, abs))
    objects.push({
      key,
      size: (await stat(abs)).size,
      ...(hash ? { hash: await hashFile(abs) } : {}),
    })
  }
  return objects.sort((a, b) => a.key.localeCompare(b.key))
}

export async function readObjectBytes(root, key) {
  return readFile(path.join(root, key))
}

export async function readObjectText(root, key) {
  return readFile(path.join(root, key), 'utf-8')
}

export async function writeObject(root, key, bytes) {
  const file = path.join(root, key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, bytes)
}
