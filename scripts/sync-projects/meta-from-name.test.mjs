import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveFromFolderName } from './meta-from-name.mjs'

// The fallback when a folder has no info.md. It is the only thing standing
// between a missing file and a project that silently fails to publish, so the
// odd shapes matter as much as the tidy ones.

test('a plain folder name becomes a title', () => {
  assert.deepEqual(deriveFromFolderName('blue-hour'), {
    title: 'Blue Hour',
    year: undefined,
  })
})

test('a trailing year is split off', () => {
  assert.deepEqual(deriveFromFolderName('blue-hour-2026'), {
    title: 'Blue Hour',
    year: '2026',
  })
})

test('a leading order number is dropped', () => {
  assert.deepEqual(deriveFromFolderName('8-lit-2024'), {
    title: 'Lit',
    year: '2024',
  })
})

test('the legacy -website marker is stripped, with any separator', () => {
  for (const name of [
    '8-lit-2024-website',
    '8-lit-2024:website',
    '8-lit-2024_website',
    '8-lit-2024 website',
  ]) {
    assert.deepEqual(deriveFromFolderName(name), { title: 'Lit', year: '2024' })
  }
})

test('non-ASCII titles survive intact', () => {
  const { title, year } = deriveFromFolderName('11-wäscheständer-2025-website')
  assert.equal(title, 'Wäscheständer')
  assert.equal(year, '2025')
})

test('a four-digit number that is not trailing stays in the title', () => {
  assert.deepEqual(deriveFromFolderName('room-1984-revisited'), {
    title: 'Room 1984 Revisited',
    year: undefined,
  })
})

test('surrounding whitespace does not leak into the title', () => {
  assert.equal(deriveFromFolderName('  blue hour  ').title, 'Blue Hour')
})

test('an empty folder name yields an empty title, which the caller skips on', () => {
  assert.equal(deriveFromFolderName('').title, '')
  assert.equal(deriveFromFolderName('   ').title, '')
})
