import { test } from 'node:test'
import assert from 'node:assert/strict'
import { variantKey, srcsetFor, VARIANT_WIDTHS } from './variants.mjs'
import { makeVariants } from './images.mjs'
import sharp from 'sharp'

test('variantKey embeds a short etag so stale files get new names', () => {
  const key = variantKey('lit-2024/one.jpg', '"d41d8cd98f00b204e9800998ecf8427e"', 1280)
  assert.equal(key, '_web/lit-2024/one-d41d8cd9-1280.avif')
})

test('variantKey changes when the source etag changes', () => {
  const a = variantKey('lit/one.jpg', '"aaaaaaaaaaaaaaaa"', 640)
  const b = variantKey('lit/one.jpg', '"bbbbbbbbbbbbbbbb"', 640)
  assert.notEqual(a, b)
})

test('srcsetFor builds a width-descriptor list', () => {
  const out = srcsetFor(
    [
      { width: 640, key: '_web/a/one-abc-640.avif' },
      { width: 1280, key: '_web/a/one-abc-1280.avif' },
    ],
    'https://pub.example.dev'
  )
  assert.equal(
    out,
    'https://pub.example.dev/_web/a/one-abc-640.avif 640w, https://pub.example.dev/_web/a/one-abc-1280.avif 1280w'
  )
})

test('makeVariants encodes AVIF and never upscales', async () => {
  const source = await sharp({
    create: { width: 1000, height: 500, channels: 3, background: '#888' },
  })
    .jpeg()
    .toBuffer()

  const variants = await makeVariants(source, VARIANT_WIDTHS)
  assert.deepEqual(
    variants.map((v) => v.width),
    [640, 1000],
    'widths above the original collapse to the original width'
  )
  for (const v of variants) {
    // sharp reports the container as 'heif' for AVIF; mediaType is exact.
    const meta = await sharp(v.bytes).metadata()
    assert.equal(meta.mediaType, 'image/avif')
  }
})

test('MAX_SOURCE_BYTES is a sane cap', async () => {
  const { MAX_SOURCE_BYTES } = await import('./variants.mjs')
  assert.ok(MAX_SOURCE_BYTES > 10 * 1024 * 1024)
  assert.ok(MAX_SOURCE_BYTES < 200 * 1024 * 1024)
})

test('an AVIF source is copied, not re-encoded, at its native width', async () => {
  // The artist is told to upload AVIF (spec §3). Re-encoding lossy AVIF into
  // lossy AVIF is generation loss, and it shows worst at the largest variant
  // where there is no downscale to hide it.
  const source = await sharp({
    create: { width: 1200, height: 600, channels: 3, background: '#4a7' },
  })
    .avif({ quality: 80 })
    .toBuffer()

  const variants = await makeVariants(source, VARIANT_WIDTHS)
  assert.deepEqual(variants.map((v) => v.width), [640, 1200])

  const native = variants.find((v) => v.width === 1200)
  assert.ok(
    native.bytes.equals(source),
    'the widest variant must be the source byte-for-byte, not a re-encode'
  )

  const narrow = variants.find((v) => v.width === 640)
  assert.ok(!narrow.bytes.equals(source), '640 is a genuine downscale')
  assert.equal((await sharp(narrow.bytes).metadata()).mediaType, 'image/avif')
})

test('a non-AVIF source is always re-encoded, never copied', async () => {
  const source = await sharp({
    create: { width: 900, height: 400, channels: 3, background: '#a47' },
  })
    .jpeg()
    .toBuffer()

  for (const v of await makeVariants(source, VARIANT_WIDTHS)) {
    assert.ok(!v.bytes.equals(source))
    assert.equal((await sharp(v.bytes).metadata()).mediaType, 'image/avif')
  }
})

test('orphanKeys finds derivatives no longer referenced by any project', async () => {
  const { orphanKeys } = await import('./variants.mjs')
  const onDisk = [
    '_web/lit/one-aaaaaaaa-640.avif', // current
    '_web/lit/one-bbbbbbbb-640.avif', // superseded: the source was re-exported
    '_web/gone/x-cccccccc-640.avif', // the whole project folder was deleted
  ]
  const used = new Set(['_web/lit/one-aaaaaaaa-640.avif'])
  assert.deepEqual(orphanKeys(onDisk, used), [
    '_web/lit/one-bbbbbbbb-640.avif',
    '_web/gone/x-cccccccc-640.avif',
  ])
})

test('orphanKeys never touches files outside the derivative prefix', async () => {
  const { orphanKeys } = await import('./variants.mjs')
  assert.deepEqual(orphanKeys(['favicon.ico', 'fonts/x.woff2'], new Set()), [])
})
