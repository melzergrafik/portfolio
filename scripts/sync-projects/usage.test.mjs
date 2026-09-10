import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize, formatSummary, WARN_BYTES, LIMIT_BYTES } from './usage.mjs'

const MB = 1024 ** 2

test('summarize totals sizes and computes percentage of the Pages site limit', () => {
  const s = summarize([{ size: 100 * MB }, { size: 80 * MB }])
  assert.equal(s.bytes, 180 * MB)
  assert.equal(s.limit, LIMIT_BYTES)
  assert.equal(s.pct, 18)
  assert.equal(s.overWarn, false)
})

test('summarize flags totals above the 70% warning line', () => {
  assert.equal(summarize([{ size: WARN_BYTES + 1 }]).overWarn, true)
  assert.equal(summarize([{ size: WARN_BYTES }]).overWarn, false)
})

test('summarize handles an empty site', () => {
  const s = summarize([])
  assert.equal(s.bytes, 0)
  assert.equal(s.pct, 0)
  assert.equal(s.overWarn, false)
})

test('summarize tolerates objects with no size', () => {
  assert.equal(summarize([{}, { size: MB }]).bytes, MB)
})

test('the warning line sits below the limit, so there is room to react', () => {
  assert.ok(WARN_BYTES < LIMIT_BYTES)
})

test('formatSummary is human readable', () => {
  assert.equal(formatSummary(summarize([{ size: 180 * MB }])), 'Site: 180 / 1024 MB — 18%')
})
