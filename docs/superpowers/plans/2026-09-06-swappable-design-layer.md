# Swappable Design Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the build machinery out of every artist's repository and behind a versioned reusable workflow, so replacing `app/` wholesale cannot break the pipeline and a pipeline fix reaches every site.

**Architecture:** `.github/workflows/deploy.yml` splits into `build.yml` (`on: workflow_call`, every current step) and a thin caller. The reusable workflow checks out the caller's repo for content and design, and a second checkout at `path: .machinery` for the generator. Artist repositories keep `content/`, their `app/`, and a six-line caller pinned to `@v1`. The generated frontmatter shape is frozen at v1 and guarded by a test.

**Tech Stack:** GitHub Actions reusable workflows, Next.js 16.3.4 static export, `node --test`, `sharp`, `gray-matter`.

**Spec:** `docs/superpowers/specs/2026-09-06-swappable-design-layer-design.md`

## Global Constraints

- **Repo:** `/Users/christophthonhauser/Projects/artist-portfolio-template`, remote `chranditho/artist-portfolio-template`, branch `main`.
- **The `v1` tag is the contract version.** No `contractVersion` field in frontmatter. Moving `v1` is a deliberate act performed only after a green demo deploy — never as part of a task's commit.
- **`ref: v1` is written literally** in the machinery checkout, never derived from `github.ref`. Deriving it lets a caller pinned to `@v1` silently run `main`'s generator.
- **`scripts/` must never import from `app/`** and nothing Next-specific. Existing test enforces this.
- **No `.env` files and no repo secrets.** `GITHUB_TOKEN` only.
- **Never auto-generate `alt` text.** Emit `alt: ''`.
- **Light mode only.** No `dark:` utilities.
- **Test runner is `node --test`.** No frameworks. Run with `pnpm test:scripts`.
- **Commits are unsigned** for this run: use `git -c commit.gpgsign=false commit`. Never modify global git config.
- Commit after every task. Do not push a tag in any task.

---

### Task 1: Freeze the v1 frontmatter contract with a test

The contract must be pinned *before* anything moves, so a later refactor
cannot widen it by accident.

**Files:**
- Create: `scripts/sync-projects/contract.test.mjs`

**Interfaces:**
- Consumes: `serializeProject` from `mdx.mjs`, `serializeAbout` from `about.mjs`.
- Produces: nothing. This task is a guard.

- [ ] **Step 1: Write the contract test**

Create `scripts/sync-projects/contract.test.mjs`:

```javascript
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
```

- [ ] **Step 2: Run it**

Run: `node --test scripts/sync-projects/contract.test.mjs`
Expected: PASS. This documents current behaviour rather than driving new code.
If anything fails, the contract in the spec is wrong — stop and report, do not
edit the spec's key list to match.

- [ ] **Step 3: Prove the test bites**

Temporarily add `lines.push(\`extra: 'x'\`)` to `frontmatterLines` in
`mdx.mjs`, re-run, confirm "unexpected project key 'extra'", then revert.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-projects/contract.test.mjs
git -c commit.gpgsign=false commit -m "test: freeze the v1 frontmatter contract"
```

---

### Task 2: Fix the stale R2 wording in generated files

Every artist reads this line. R2 has been gone since the GitHub-only pivot.

**Files:**
- Modify: `scripts/sync-projects/mdx.mjs`
- Modify: `scripts/sync-projects/about.mjs`
- Modify: `scripts/sync-projects/mdx.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: unchanged function signatures. Body text only.

- [ ] **Step 1: Write the failing test**

Append to `scripts/sync-projects/mdx.test.mjs`:

```javascript
test('generated files point the reader at content/, not the dead R2 bucket', async () => {
  const { serializeAbout } = await import('./about.mjs')
  const project = serializeProject({
    title: 'X',
    images: [{ src: '/a.avif', width: 1, height: 1, blurDataURL: 'x' }],
  })
  const about = serializeAbout({ name: 'Dave', body: '' })

  for (const [name, out] of [['project', project], ['about', about]]) {
    assert.doesNotMatch(out, /R2/, `${name} still mentions R2`)
    assert.match(out, /content\//, `${name} must say where to edit instead`)
  }
  assert.match(project, /content\/<project>\/info\.md/)
  assert.match(about, /content\/_about\/info\.md/)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test scripts/sync-projects/mdx.test.mjs`
Expected: FAIL — "project still mentions R2".

- [ ] **Step 3: Fix both comments**

In `mdx.mjs`, replace the `comment` line with:

```javascript
  const comment =
    '{/* Generated by sync-projects — edit content/<project>/info.md, not here. */}'
```

In `about.mjs`:

```javascript
  const comment =
    '{/* Generated by sync-projects — edit content/_about/info.md, not here. */}'
```

- [ ] **Step 4: Run the whole suite**

Run: `pnpm test:scripts`
Expected: PASS, all tests.

- [ ] **Step 5: Regenerate and commit**

```bash
node scripts/sync-projects/index.mjs
git add scripts app
git -c commit.gpgsign=false commit -m "fix: point generated files at content/, not the removed R2 bucket"
```

---

### Task 3: Split the workflow into a reusable build and a thin caller

**Files:**
- Create: `.github/workflows/build.yml`
- Rewrite: `.github/workflows/deploy.yml`
- Create: `.github/workflows/workflows.test.mjs`
- Modify: `package.json` (add the workflow tests to `test:scripts`)

**Interfaces:**
- Produces: a reusable workflow callable as
  `chranditho/artist-portfolio-template/.github/workflows/build.yml@v1`,
  taking no inputs and no secrets.

- [ ] **Step 1: Write the failing workflow test**

Create `.github/workflows/workflows.test.mjs`:

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const read = (f) => readFile(path.join(DIR, f), 'utf-8')

test('build.yml is callable and needs no secrets', async () => {
  const src = await read('build.yml')
  assert.match(src, /workflow_call:/, 'must be reusable')
  assert.equal((src.match(/secrets\./g) ?? []).length, 0, 'this design has no secrets')
})

test('build.yml checks out the machinery at a literal tag, never a moving ref', async () => {
  const src = await read('build.yml')
  assert.match(src, /path: \.machinery/, 'the machinery is checked out separately')
  assert.match(src, /ref: v1/, 'pinned to the contract tag')
  assert.doesNotMatch(
    src,
    /ref: \$\{\{\s*github\.(ref|sha)/,
    'deriving the ref lets a caller pinned to @v1 run main'
  )
})

test('build.yml runs the generator from the machinery, not the caller repo', async () => {
  const src = await read('build.yml')
  assert.match(src, /node \.machinery\/scripts\/sync-projects\/index\.mjs/)
  assert.doesNotMatch(
    src,
    /run: node scripts\/sync-projects/,
    'an artist repo has no scripts/ in play'
  )
})

test('the caller documented for artists pins a tag, never @main', async () => {
  // Copy-pasted by every artist. A @main here would hand them an unpinned
  // pipeline and silently defeat the contract tag.
  const doc = await readFile(path.join(DIR, '..', '..', 'README.md'), 'utf-8')
  const callers = [...doc.matchAll(/uses:\s*\S+\/\.github\/workflows\/build\.yml@(\S+)/g)]
  assert.ok(callers.length > 0, 'README must show the caller artists copy')
  for (const [, ref] of callers) {
    assert.notEqual(ref, 'main', 'the documented caller must not track main')
    assert.match(ref, /^v\d+$/, `caller pins '${ref}'; expected a major tag like v1`)
  }
})

test('deploy.yml is a thin caller of the local build workflow', async () => {
  const src = await read('deploy.yml')
  assert.match(src, /uses: \.\/\.github\/workflows\/build\.yml/, 'the template dogfoods its own machinery')
  assert.ok(src.split('\n').length < 25, 'the caller must stay small enough to copy by hand')
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test .github/workflows/workflows.test.mjs`
Expected: FAIL — `build.yml` does not exist.

- [ ] **Step 3: Create `build.yml`**

```yaml
name: Build and deploy

# Called by an artist's repo:
#   jobs:
#     deploy:
#       uses: chranditho/artist-portfolio-template/.github/workflows/build.yml@v1
on:
  workflow_call:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      # Pages is a repository setting, so it cannot ship in the template and no
      # workflow can switch it on: GITHUB_TOKEN has no `administration` scope.
      # Without this step configure-pages dies with "Get Pages site failed",
      # which tells the artist nothing.
      - name: Check Pages is turned on
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          if ! gh api "repos/$GITHUB_REPOSITORY/pages" >/dev/null 2>&1; then
            echo "::error title=GitHub Pages is not turned on yet::\
          Open Settings > Pages, set 'Source' to 'GitHub Actions', then re-run \
          this workflow from the Actions tab. Only the repository owner can do \
          this. Everything else is already set up."
            exit 1
          fi

      # The artist's repository: their content and their design.
      - uses: actions/checkout@v7

      # The machinery. Pinned to a literal tag, never github.ref — otherwise a
      # caller pinned to @v1 would silently run main's generator.
      - name: Check out the build machinery
        uses: actions/checkout@v7
        with:
          repository: chranditho/artist-portfolio-template
          ref: v1
          path: .machinery

      - uses: jdx/mise-action@v4

      # The artist's design deps, then the generator's. Keeping them separate is
      # what lets an artist's package.json carry only what their design needs.
      - run: pnpm install --frozen-lockfile
      - run: pnpm install --frozen-lockfile
        working-directory: .machinery

      - id: pages
        uses: actions/configure-pages@v6

      # Derivative filenames carry a hash of their source bytes, so a cached
      # file is current by construction. The restore-keys prefix matters: any
      # content change misses the exact key, and without a prefix fallback the
      # run would re-encode every image instead of just the changed ones.
      - uses: actions/cache@v6
        with:
          path: public/_web
          key: avif-${{ hashFiles('content/**') }}
          restore-keys: avif-

      # The generator writes absolute image URLs into the MDX, and Next does not
      # rewrite those the way it does its own assets — so it needs the same base
      # path, or every image 404s on a project site.
      - run: node .machinery/scripts/sync-projects/index.mjs
        env:
          PUBLIC_BASE: ${{ steps.pages.outputs.base_path }}

      - run: pnpm build
        env:
          NEXT_PUBLIC_SITE_URL: ${{ steps.pages.outputs.base_url }}
          NEXT_PUBLIC_BASE_PATH: ${{ steps.pages.outputs.base_path }}

      - uses: actions/upload-pages-artifact@v5
        with:
          path: out

      - id: deploy
        uses: actions/deploy-pages@v5
```

- [ ] **Step 4: Rewrite `deploy.yml` as the caller**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    uses: ./.github/workflows/build.yml
```

- [ ] **Step 5: Wire the workflow tests into the suite**

In `package.json`, change `test:scripts` to:

```json
"test:scripts": "node --test scripts/sync-projects/*.test.mjs app/projects/*.test.mjs app/lib/*.test.mjs .github/workflows/*.test.mjs"
```

- [ ] **Step 6: Run everything**

Run: `pnpm test:scripts`
Expected: PASS.

Then: `pnpm dlx @action-validator/cli@latest .github/workflows/build.yml && pnpm dlx @action-validator/cli@latest .github/workflows/deploy.yml`
Expected: exit 0 for both.

- [ ] **Step 7: Commit**

```bash
git add .github package.json
git -c commit.gpgsign=false commit -m "feat: split the build into a reusable workflow pinned at v1"
```

**Known cost, accepted:** the second `pnpm install` in `.machinery` pulls the
template's full dependency set — `next` and `react` included — although the
generator needs only `sharp` and `gray-matter`. That is a handful of seconds on
a 46-second run. The upgrade, if it ever matters, is a separate
`scripts/package.json` installed on its own; do not build it now.

**Note for the executor:** the `v1` tag does not exist yet, so the *cross-repo*
path is unproven until Task 6. `deploy.yml` uses a local ref and works
immediately. Do not create the tag here.

---

### Task 4: Enforce the six design rules with tests

Each rule has already broken this site once. They are guards, not style.

**Files:**
- Create: `app/design-contract.test.mjs`

**Interfaces:**
- Consumes: the files under `app/` and `next.config.ts`.
- Produces: nothing. This task is a guard a design port must keep green.

- [ ] **Step 1: Write the failing test**

Create `app/design-contract.test.mjs`:

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

// Rules any replacement design must honour. Rules 4 and 5 each broke this
// site during development, so they are checked rather than written down.

const APP = path.dirname(new URL(import.meta.url).pathname)
const ROOT = path.join(APP, '..')

async function sources() {
  const entries = await readdir(APP, { recursive: true, withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => path.join(e.parentPath ?? e.path, e.name))
}

test('rule 2: no design uses next/image', async () => {
  for (const file of await sources()) {
    const src = await readFile(file, 'utf-8')
    assert.doesNotMatch(
      src,
      /from ['"]next\/image['"]/,
      `${path.relative(ROOT, file)} imports next/image — variants are pre-generated`
    )
  }
})

test('rule 3: no alt text is written into a component', async () => {
  for (const file of await sources()) {
    const src = await readFile(file, 'utf-8')
    const alts = [...src.matchAll(/\balt=["']([^"']+)["']/g)].map((m) => m[1])
    assert.deepEqual(alts, [], `${path.relative(ROOT, file)} hardcodes alt text`)
  }
})

test('rule 4: static export settings are intact', async () => {
  const config = await readFile(path.join(ROOT, 'next.config.ts'), 'utf-8')
  assert.match(config, /output:\s*["']export["']/)
  assert.match(config, /trailingSlash:\s*true/)
  assert.match(config, /NEXT_PUBLIC_BASE_PATH/, 'basePath must come from the workflow')
})

test('rule 5: every dynamic route exports generateStaticParams', async () => {
  const pages = (await sources()).filter(
    (f) => path.basename(f).startsWith('page.') && /\[[^\]]+\]/.test(f)
  )
  assert.ok(pages.length > 0, 'expected at least one dynamic route')
  for (const file of pages) {
    const src = await readFile(file, 'utf-8')
    assert.match(
      src,
      /export (async )?function generateStaticParams/,
      `${path.relative(ROOT, file)} has no generateStaticParams — output: export cannot build it`
    )
  }
})

test('rule 6: no server-only features', async () => {
  for (const file of await sources()) {
    const src = await readFile(file, 'utf-8')
    const rel = path.relative(ROOT, file)
    assert.doesNotMatch(src, /export const revalidate/, `${rel} uses revalidate`)
    assert.doesNotMatch(src, /['"]use server['"]/, `${rel} uses a server action`)
  }
  const routes = (await sources()).filter((f) => /route\.tsx?$/.test(path.basename(f)))
  assert.deepEqual(routes, [], 'route handlers cannot be statically exported')
})
```

- [ ] **Step 2: Run it**

Run: `node --test app/design-contract.test.mjs`
Expected: PASS against the current design.

- [ ] **Step 3: Prove each rule bites**

One at a time, break it and confirm a failure naming the file, then revert:
- add `import Image from 'next/image'` to `app/components/nav.tsx` → rule 2 fails
- add `alt="a painting"` to any element in `app/components/gallery.tsx` → rule 3 fails
- delete `trailingSlash: true` from `next.config.ts` → rule 4 fails
- delete `generateStaticParams` from `app/projects/[slug]/page.tsx` → rule 5 fails

Record in the task report which four you verified.

- [ ] **Step 4: Wire into the suite**

In `package.json`, add `app/*.test.mjs` to `test:scripts`:

```json
"test:scripts": "node --test scripts/sync-projects/*.test.mjs app/*.test.mjs app/projects/*.test.mjs app/lib/*.test.mjs .github/workflows/*.test.mjs"
```

- [ ] **Step 5: Run everything and commit**

Run: `pnpm test:scripts`
Expected: PASS.

```bash
git add app package.json
git -c commit.gpgsign=false commit -m "test: enforce the six rules a replacement design must honour"
```

---

### Task 5: Document the split for artists, agents and the maintainer

**Files:**
- Modify: `AGENTS.md`
- Modify: `ARTIST.md`
- Modify: `README.md`
- Create: `.github/ISSUE_TEMPLATE/different-look.yml`

**Interfaces:**
- Consumes: the caller workflow shape from Task 3.
- Produces: the copy the workflow test in Task 3 checks — `README.md` must
  contain a caller referencing a major tag (`@v1`), never `@main`.

- [ ] **Step 1: Add the design-port rules to `AGENTS.md`**

Append:

```markdown
## Replacing the design

`app/` is yours to replace wholesale. The build is not in this repository —
it runs from `.github/workflows/deploy.yml`, which calls the machinery in the
template at a pinned tag. So a design port cannot break the pipeline.

Six rules a replacement must keep. `pnpm test:scripts` checks all of them:

1. **Read only generated MDX.** Never author content in `app/projects/items/`
   or `app/about.mdx` — the next build overwrites it.
2. **No `next/image`.** Variants are pre-generated; render `<img srcset sizes>`.
3. **Never write `alt` text.** It ships empty for the artist to fill in.
4. **Keep `output: 'export'`, `trailingSlash: true`**, and read `basePath`
   from `NEXT_PUBLIC_BASE_PATH`.
5. **Every dynamic route needs `generateStaticParams`.** Static export fails
   without it, and fails again if it returns an empty array.
6. **No server-only features** — no route handlers, no server actions, no
   `revalidate`.

## The inert `scripts/` copy

Your repository carries a copy of `scripts/` that your workflow does not run —
it came with the template. Leave it alone. It exists so you can stop depending
on the template at any time: replace `.github/workflows/deploy.yml` with the
full build steps from the template's `build.yml`, point them at your own
`scripts/`, and nothing else changes.
```

- [ ] **Step 2: Add the design section to `ARTIST.md`**

Insert before "## Asking for changes":

```markdown
## Making it look the way you want

You are not stuck with this layout. Bring a design and it gets built:

- **Show a mockup or a screenshot** — open a "I want a different look" issue
  and drag the image in.
- **Link a site you like** — put the address in the same issue.
- **Work it out together** in a live session.

None of that touches your images or text. `content/` stays exactly as it is,
and the site keeps rebuilding the same way.
```

- [ ] **Step 3: Create the issue form**

`.github/ISSUE_TEMPLATE/different-look.yml`:

```yaml
name: I want a different look
description: A mockup, a site you like, or just a description of the feeling.
labels: [design]
body:
  - type: textarea
    id: reference
    attributes:
      label: What should it look like?
      description: >
        Drag in a screenshot or mockup, paste a link to a site you like, or
        just describe it. All three work.
    validations: { required: true }
  - type: dropdown
    id: scope
    attributes:
      label: How much of the site?
      options:
        - Everything
        - Just the homepage
        - Just the project pages
        - Just the about page
    validations: { required: true }
  - type: textarea
    id: keep
    attributes:
      label: Anything you want kept exactly as it is?
    validations: { required: false }
```

- [ ] **Step 4: Update `README.md`**

Replace the "A new site" section's closing paragraph with:

```markdown
### Where the machinery lives

An artist's repository holds their content, their design, and a six-line
workflow. The pipeline — AVIF variants, the derivative cache, static export,
Pages deployment — lives here and is called by tag:

```yaml
jobs:
  deploy:
    uses: chranditho/artist-portfolio-template/.github/workflows/build.yml@v1
```

That means replacing `app/` wholesale cannot break a build, and a fix here
reaches every site on its next run. It also means every site depends on this
repository and on `v1` continuing to work — so `v1` moves only after the demo
site on this repo has deployed green from `main`.

Repositories generated from a template have unrelated histories and cannot
merge from it, which is why the machinery is shared by workflow reference
rather than by expecting anyone to pull.
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm test:scripts`
Expected: PASS — including the Task 3 test asserting `deploy.yml` stays small.

Validate the new form parses:
```bash
pnpm add -D yaml --silent
node -e "const Y=require('yaml'),f=require('fs');const d=Y.parse(f.readFileSync('.github/ISSUE_TEMPLATE/different-look.yml','utf8'));if(!d.name||!d.body)throw new Error('bad form');console.log('ok')"
pnpm remove yaml --silent
```

```bash
git add AGENTS.md ARTIST.md README.md .github
git -c commit.gpgsign=false commit -m "docs: the design layer is the artist's, the machinery is not"
```

---

### Task 6: Prove the cross-repo path, then cut v1

> **This task pushes to a public repository and creates a tag other sites will
> depend on. Get the user's go-ahead before Step 2.**

**Files:**
- None. This task is verification and a tag.

- [ ] **Step 1: Confirm the local path works**

```bash
git push origin main
```

Wait for the run, then confirm it succeeded and that `deploy.yml` delegated to
`build.yml`:

```bash
gh run list --repo chranditho/artist-portfolio-template --limit 1 \
  --json conclusion,displayTitle --jq '.[] | "\(.conclusion)  \(.displayTitle)"'
```
Expected: `success`.

Confirm the site still serves:
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://chranditho.github.io/artist-portfolio-template/
```
Expected: `200`.

- [ ] **Step 2: Cut the tag — REQUIRES USER GO-AHEAD**

Only after Step 1 is green:

```bash
git tag -a v1 -m "v1: frontmatter contract and build machinery"
git push origin v1
```

- [ ] **Step 3: Verify the machinery checkout resolves**

The `ref: v1` checkout inside `build.yml` could not resolve before the tag
existed. Re-run and confirm it now does:

```bash
gh workflow run deploy.yml --repo chranditho/artist-portfolio-template
```

Wait, then check the machinery checkout step specifically:

```bash
ID=$(gh run list --repo chranditho/artist-portfolio-template --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view $ID --repo chranditho/artist-portfolio-template --log \
  | grep -iE "Check out the build machinery|\.machinery|Cache (hit|restored)" | head
```
Expected: the machinery checkout succeeds and the AVIF cache still hits.

- [ ] **Step 4: Record the result**

Write into the task report: the run id, whether the cache hit, and the total
run time compared with the 46s baseline before the split.

---

## Verification checklist

- [ ] `pnpm test:scripts` passes; the contract, design-rule and workflow tests are all in it
- [ ] `pnpm build` still produces `out/` from a clean clone
- [ ] `grep -rn "R2" scripts app | grep -v "\.test\."` → empty
- [ ] `grep -c "secrets\." .github/workflows/build.yml` → 0
- [ ] `build.yml` pins `ref: v1` literally, with no `github.ref` interpolation
- [ ] `deploy.yml` is under 25 lines and calls `./.github/workflows/build.yml`
- [ ] The demo site still serves 200 on every page after the split
- [ ] `v1` exists and `build.yml`'s machinery checkout resolves against it
