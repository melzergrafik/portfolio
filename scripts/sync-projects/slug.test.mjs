import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from './slug.mjs'

test('lowercases and hyphenates spaces', () => {
  assert.equal(slugify('Budding Resistance'), 'budding-resistance')
})

test('strips punctuation and collapses repeats', () => {
  assert.equal(slugify('buddiing resistance:website'), 'buddiing-resistance-website')
})

test('trims leading/trailing separators', () => {
  assert.equal(slugify('  North Rooms!  '), 'north-rooms')
})

test('keeps existing clean slugs intact', () => {
  assert.equal(slugify('forest-light'), 'forest-light')
})

test('transliterates German umlauts and eszett', () => {
  assert.equal(slugify('Blaumann in Weiß'), 'blaumann-in-weiss')
  assert.equal(slugify('Wäscheständer I Want To Ii'), 'waeschestaender-i-want-to-ii')
})
