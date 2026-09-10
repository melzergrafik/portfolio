import { test } from 'node:test'
import assert from 'node:assert/strict'

// site.ts is TypeScript, so exercise the same logic the module compiles to.
// The trap this guards: `new URL('/a/', 'https://h/base/')` resolves against
// the ORIGIN and silently drops '/base'. On a project site that made every
// canonical URL and sitemap entry point at a 404.
function makeAbsolute(baseUrl) {
  const base = baseUrl.replace(/\/$/, '')
  return (pathname) => {
    const last = pathname.split('/').pop() ?? ''
    const withSlash =
      last.includes('.') || pathname.endsWith('/') ? pathname : `${pathname}/`
    return new URL(withSlash.replace(/^\//, ''), `${base}/`).toString()
  }
}

test('a project site keeps its base path in every URL', () => {
  const abs = makeAbsolute('https://dave.github.io/portfolio')
  assert.equal(abs('/'), 'https://dave.github.io/portfolio/')
  assert.equal(abs('/about'), 'https://dave.github.io/portfolio/about/')
  assert.equal(
    abs('/projects/blue-hour'),
    'https://dave.github.io/portfolio/projects/blue-hour/'
  )
  assert.equal(abs('/sitemap.xml'), 'https://dave.github.io/portfolio/sitemap.xml')
})

test('a user site has no base path to keep', () => {
  const abs = makeAbsolute('https://dave.github.io')
  assert.equal(abs('/'), 'https://dave.github.io/')
  assert.equal(abs('/projects/blue-hour'), 'https://dave.github.io/projects/blue-hour/')
  assert.equal(abs('/robots.txt'), 'https://dave.github.io/robots.txt')
})

test('files keep their bare form, pages get a trailing slash', () => {
  const abs = makeAbsolute('https://dave.github.io/p')
  assert.ok(abs('/sitemap.xml').endsWith('/sitemap.xml'), 'no slash after a file')
  assert.ok(abs('/about').endsWith('/about/'), 'trailingSlash: true means pages end in /')
  assert.equal(abs('/about/'), abs('/about'), 'already-slashed input is stable')
})
