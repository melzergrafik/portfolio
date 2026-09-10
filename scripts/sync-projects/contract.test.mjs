import { test } from 'node:test'
import assert from 'node:assert/strict'
import matter from 'gray-matter'
import { serializeProject } from './mdx.mjs'
import { serializeAbout } from './about.mjs'

// The v1 contract. A design pinned to @v1 reads exactly these keys, so
// changing or removing one is a v2 and must fail here first. Adding an
// OPTIONAL key is allowed — update the list deliberately, never to make a
// red test green.

const PROJECT_KEYS = [
  'title', 'year', 'publishedAt', 'summary', 'medium', 'location', 'images',
]
const IMAGE_KEYS = [
  'src', 'alt', 'width', 'height', 'blurDataURL', 'srcset', 'thumb',
]
const ABOUT_KEYS = [
  'name', 'tagline', 'instagram', 'email',
  'portraitSrc', 'portraitSrcset', 'portraitWidth', 'portraitHeight',
  'portraitBlur',
]

const fullProject = {
  slug: 'blue-hour',
  title: 'Blue Hour',
  year: '2026',
  publishedAt: '2026-01-01',
  summary: 'A series.',
  medium: 'Oil on canvas',
  location: 'Vienna',
  body: 'Body text.',
  images: [
    {
      src: '/_web/blue-hour/one-abcdef12-2000.avif',
      width: 2000,
      height: 1333,
      blurDataURL: 'data:image/jpeg;base64,AAAA',
      srcset: '/_web/blue-hour/one-abcdef12-640.avif 640w',
      thumb: true,
    },
  ],
}

test('a project emits only v1 keys', () => {
  const { data } = matter(serializeProject(fullProject))
  for (const key of Object.keys(data)) {
    assert.ok(PROJECT_KEYS.includes(key), `unexpected project key '${key}' — this is a v2`)
  }
  for (const key of Object.keys(data.images[0])) {
    assert.ok(IMAGE_KEYS.includes(key), `unexpected image key '${key}' — this is a v2`)
  }
})

test('every v1 project key round-trips with the value it was given', () => {
  const { data } = matter(serializeProject(fullProject))
  assert.equal(data.title, 'Blue Hour')
  assert.equal(data.year, '2026')
  assert.equal(data.publishedAt, '2026-01-01')
  assert.equal(data.summary, 'A series.')
  assert.equal(data.medium, 'Oil on canvas')
  assert.equal(data.location, 'Vienna')

  const img = data.images[0]
  assert.equal(img.src, '/_web/blue-hour/one-abcdef12-2000.avif')
  assert.equal(img.width, 2000)
  assert.equal(img.height, 1333)
  assert.equal(img.srcset, '/_web/blue-hour/one-abcdef12-640.avif 640w')
  assert.equal(img.thumb, true)
})

test('alt ships empty and is never machine-written', () => {
  const { data } = matter(serializeProject(fullProject))
  assert.equal(data.images[0].alt, '', 'a wrong description of art is worse than none')
})

test('only title is required; every other project key is optional', () => {
  const { data } = matter(
    serializeProject({ title: 'Bare', images: [{ src: '/a.avif', width: 1, height: 1, blurDataURL: 'x' }] })
  )
  assert.equal(data.title, 'Bare')
  for (const key of ['year', 'publishedAt', 'summary', 'medium', 'location']) {
    assert.ok(!(key in data), `${key} must be omitted when absent, not emitted empty`)
  }
})

test('about emits only v1 keys, and name is the only required one', () => {
  const { data } = matter(
    serializeAbout({
      name: 'Dave',
      tagline: 'Painter',
      instagram: 'https://instagram.com/dave',
      email: 'dave@example.com',
      body: 'Bio.',
      portrait: {
        src: '/_web/_about/p-abcdef12-1280.avif',
        srcset: '/_web/_about/p-abcdef12-640.avif 640w',
        width: 1280,
        height: 960,
        blurDataURL: 'data:image/jpeg;base64,AAAA',
      },
    })
  )
  for (const key of Object.keys(data)) {
    assert.ok(ABOUT_KEYS.includes(key), `unexpected about key '${key}' — this is a v2`)
  }
  assert.equal(data.name, 'Dave')
  assert.equal(data.portraitWidth, 1280)

  const bare = matter(serializeAbout({ name: 'Solo', body: '' })).data
  assert.deepEqual(Object.keys(bare), ['name'])
})

test('a quote in artist copy does not break the frontmatter', () => {
  const { data } = matter(
    serializeProject({ title: "Dave's Work", images: [{ src: '/a.avif', width: 1, height: 1, blurDataURL: 'x' }] })
  )
  assert.equal(data.title, "Dave's Work")
})
