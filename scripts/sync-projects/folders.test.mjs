import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isReservedFolder, splitFolders } from './folders.mjs'

test('folders starting with _ are reserved', () => {
  assert.equal(isReservedFolder('_about/'), true)
  assert.equal(isReservedFolder('_web/'), true)
  assert.equal(isReservedFolder('budding-resistance/'), false)
  assert.equal(isReservedFolder('8-lit-2024-website/'), false)
})

test('splitFolders separates projects from the about folder', () => {
  const { projects, about } = splitFolders([
    '_web/',
    'lit-2024/',
    '_about/',
    'resistance/',
  ])
  assert.deepEqual(projects, ['lit-2024/', 'resistance/'])
  assert.equal(about, '_about/')
})

test('splitFolders returns null about when absent', () => {
  const { projects, about } = splitFolders(['lit-2024/'])
  assert.deepEqual(projects, ['lit-2024/'])
  assert.equal(about, null)
})
