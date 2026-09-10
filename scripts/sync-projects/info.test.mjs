import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseInfo } from './info.mjs'

const sample = `title: Budding Resistance
year: 2026
published: 2026-05-26
medium: Oil on linen
summary: A one-line summary.
thumbnail: H6044959.avif
---
First paragraph.

Second paragraph.`

test('parses header fields', () => {
  const { fields } = parseInfo(sample)
  assert.equal(fields.title, 'Budding Resistance')
  assert.equal(fields.year, '2026')
  assert.equal(fields.thumbnail, 'H6044959.avif')
})

test('captures the body verbatim after the separator', () => {
  const { body } = parseInfo(sample)
  assert.equal(body, 'First paragraph.\n\nSecond paragraph.')
})

test('tolerates extra whitespace and ignores headerless lines', () => {
  const { fields } = parseInfo('  title :  Hello  \nnonsense line\n---\nbody')
  assert.equal(fields.title, 'Hello')
})

test('handles missing separator as all-header, empty body', () => {
  const { fields, body } = parseInfo('title: No Body')
  assert.equal(fields.title, 'No Body')
  assert.equal(body, '')
})

test('only splits on the first colon (values may contain colons)', () => {
  const { fields } = parseInfo('location: Vienna: Galerie Steinweg\n---\n')
  assert.equal(fields.location, 'Vienna: Galerie Steinweg')
})

test('a YAML-style fenced header parses the same as a bare one', () => {
  // Every markdown editor writes `---` fences, so an artist will produce this
  // far more often than the bare form. Dropping the fields silently would show
  // up as a project with no summary and no way to tell why.
  const fenced = parseInfo('---\ntitle: Lit\nyear: 2024\n---\nBody text.\n')
  assert.equal(fenced.fields.title, 'Lit')
  assert.equal(fenced.fields.year, '2024')
  assert.equal(fenced.body, 'Body text.')

  const bare = parseInfo('title: Lit\nyear: 2024\n---\nBody text.\n')
  assert.deepEqual(fenced, bare)
})

test('a fence with leading blank lines still parses', () => {
  const out = parseInfo('\n\n---\nname: Dave\n---\nBio.\n')
  assert.equal(out.fields.name, 'Dave')
  assert.equal(out.body, 'Bio.')
})

test('a body containing a horizontal rule is not mistaken for a header', () => {
  const out = parseInfo('title: Lit\n---\nOne.\n\n---\n\nTwo.\n')
  assert.equal(out.fields.title, 'Lit')
  assert.equal(out.body, 'One.\n\n---\n\nTwo.')
})
