import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serializeAbout } from './about.mjs'

test('serializeAbout writes frontmatter and body', () => {
  const out = serializeAbout({
    name: 'Dave Example',
    tagline: 'Painter, Vienna',
    instagram: 'https://instagram.com/dave',
    email: 'dave@example.com',
    portrait: {
      src: 'https://pub.example.dev/_web/_about/me-800.avif',
      width: 800,
      height: 1200,
      blurDataURL: 'data:image/jpeg;base64,AAA',
    },
    body: 'I paint large things.\n\nSometimes small ones.',
  })

  assert.match(out, /^---\n/)
  assert.match(out, /name: 'Dave Example'/)
  assert.match(out, /tagline: 'Painter, Vienna'/)
  assert.match(out, /instagram: 'https:\/\/instagram\.com\/dave'/)
  assert.match(out, /email: 'dave@example\.com'/)
  assert.match(out, /portraitSrc: 'https:\/\/pub\.example\.dev\/_web\/_about\/me-800\.avif'/)
  assert.match(out, /portraitWidth: 800/)
  assert.match(out, /I paint large things\./)
})

test('serializeAbout omits absent optional fields and portrait', () => {
  const out = serializeAbout({ name: 'Solo', body: '' })
  assert.match(out, /name: 'Solo'/)
  assert.ok(!out.includes('instagram:'), 'no empty instagram key')
  assert.ok(!out.includes('portraitSrc:'), 'no portrait keys without a portrait')
})

test("serializeAbout escapes single quotes YAML-style", () => {
  const out = serializeAbout({ name: "Ada O'Neill", body: '' })
  assert.match(out, /name: 'Ada O''Neill'/)
})
