# Swappable design layer — design

Date: 2026-09-06
Status: approved (brainstorm), pending implementation plan
Supersedes nothing; extends `2026-09-05-portfolio-template-design.md`

## Problem

Artists arrive with a design. They show a mockup, link a site they like,
or work it out live with the maintainer. Today the only answer is "edit
`app/` in your repo", and `app/` sits in the same repository as the
machinery that took this project its whole history to get right — the
AVIF pipeline, the derivative cache, the static-export config, the SEO,
the Pages base-path handling.

That is the actual problem, and it is not about theming. **A wholesale
design replacement is currently a large diff across a repo that also
contains everything that must not break.** The blast radius of "make it
look like this" includes the build.

A second problem follows from GitHub's own rules. Repositories created
from a template have *unrelated histories* — GitHub is explicit that you
cannot merge between them. So a fix to the pipeline reaches exactly zero
existing sites. At one site that is invisible. At five it is a chore
performed five times, badly.

## Goal

An artist's repository contains their content, their design, and nothing
else. Replacing the design cannot break the build, because the build is
not there to break. A pipeline fix reaches every site on its next run.

## Non-goals

- Theming primitives (tokens, presets, a design system). The artist is
  not choosing from options; they are bringing a design.
- Supporting non-Next.js designs. Unchanged from the parent spec.
- Publishing anything to npm. No new account, no new registry.
- Automatic migration of existing sites. There is one site today (the
  template's own demo) and it is the migration test.

## Architecture

### 1. The three-layer split

| Layer | Lives in | Owned by | Changes |
|---|---|---|---|
| **Machinery** — generator, AVIF pipeline, cache, build, deploy | template repo only, referenced by tag | maintainer | often |
| **Contract** — the generated frontmatter shape | both sides, enforced by tests | maintainer | rarely |
| **Design** — `app/`, including the MDX reader | artist repo | artist | freely |

The reader (`app/projects/utils.ts`, ~100 lines of `gray-matter` and a
sort) sits deliberately in the *design* column. Making a design import a
package to read a markdown file would invert the dependency for no gain.
The real contract is the frontmatter shape, and that is pinned by a
version tag and a test, not by shared code.

### 2. Machinery as a reusable workflow

`.github/workflows/build.yml` in the template gains
`on: workflow_call` and holds every step the current `deploy.yml` has.

An artist repository's entire CI becomes:

```yaml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  deploy:
    uses: chranditho/artist-portfolio-template/.github/workflows/build.yml@v1
```

This is GitHub's documented mechanism for maintaining a workflow in one
place, and referencing a trusted workflow you own by a moving major tag
is how `actions/checkout@v7` itself works.

**How the generator runs without living in the artist's repo.** Inside
the reusable workflow, `actions/checkout` takes the *caller's*
repository — content and design. A second checkout takes the machinery:

```yaml
- uses: actions/checkout@v7                 # the artist's repo
- uses: actions/checkout@v7                 # the machinery
  with:
    repository: chranditho/artist-portfolio-template
    ref: v1
    path: .machinery
```

The generator then runs from `.machinery/scripts/sync-projects/`, with
`SOURCE_DIR` and the output paths pointing at the caller's checkout. Its
dependencies (`sharp`) install into `.machinery`, so an artist's
`package.json` carries only what their design needs.

`ref: v1` is written literally rather than derived from the calling ref.
Deriving it would let a caller pinned to `@v1` silently pull `main`'s
generator, which defeats the pin.

### 3. The contract, and why there is no version field

**The tag is the contract version.** A site pinned to `@v1` gets v1's
frontmatter for as long as it stays pinned. Adding a `contractVersion`
field to every MDX file would encode the same fact twice and let the two
disagree.

What v1 emits, frozen:

```yaml
title: string            # always present
year: string             # optional
publishedAt: string      # optional, YYYY-MM-DD
summary: string          # optional
medium: string           # optional
location: string         # optional
images:
  - src: string          # root-relative, base-path aware
    alt: ''              # ALWAYS empty — never machine-written
    width: number
    height: number
    blurDataURL: string  # data: URI
    srcset: string       # optional, width descriptors
    thumb: true          # optional, at most one per project
```

and for `about.mdx`: `name` (required), `tagline`, `instagram`, `email`,
`portraitSrc`, `portraitSrcset`, `portraitWidth`, `portraitHeight`,
`portraitBlur`.

Changing or removing any of these is a `v2`. Adding an optional field is
not — a design that ignores it is unaffected.

A test in the template asserts the exact emitted key set, so widening the
contract is a deliberate act with a failing test attached, not a
side effect of an edit.

### 4. What a replacement design must honour

Six rules, each mechanically checkable, stated in `AGENTS.md` and
enforced by a `contract.test.mjs` that a design port must keep green:

1. **Read only generated MDX.** Never author content in
   `app/projects/items/` or `app/about.mdx`.
2. **No `next/image`.** Variants are pre-generated; render
   `<img srcset sizes>`.
3. **Never write `alt` text.** It ships empty for the artist to fill.
4. **Keep `output: 'export'`, `trailingSlash: true`,** and read
   `basePath` from `NEXT_PUBLIC_BASE_PATH`.
5. **Every dynamic route needs `generateStaticParams`.** Static export
   fails without it, and fails again on an empty array.
6. **No server-only features** — no route handlers, no server actions,
   no `revalidate`.

Rules 4 and 5 are not style preferences: each one has already broken
this site once during development.

### 5. How a design actually gets ported

The three channels the maintainer described, and what each produces:

- **They show a mockup or screenshot** → the maintainer or Copilot works
  from it against the six rules.
- **They link a site they like** → same, with the reference URL in the
  issue.
- **A live session** → the design is built directly against the running
  site.

All three converge on the same mechanical step: replace
`app/components/*` and the page files — currently 668 lines total — and
keep `pnpm test:scripts` and `pnpm build` green. A new issue form,
**"I want a different look"**, captures a reference link or image plus
which pages it applies to.

Nothing about the port touches `content/`, `scripts/` (which no longer
exists in the artist repo), or the workflow.

### 6. What changes in the template repo

- `deploy.yml` splits into `build.yml` (`workflow_call`, all steps) and
  a thin `deploy.yml` that calls it with a local ref, so the template
  dogfoods its own machinery.
- A `v1` tag, moved deliberately and only after the demo site proves the
  change on `main`.
- `scripts/` stays here. Creating a repo from a template copies every
  file, so new sites *do* carry an inert copy of the machinery they no
  longer run. That is deliberate — see §7.
- The generated-file comments still say "edit info.md in R2, not here".
  R2 has been gone since the pivot; they must say `content/`.

### 7. The inert copy is the escape hatch

Because template creation copies every file, each new site ships with a
full copy of `scripts/` that its workflow does not invoke. Rather than
delete it, keep it and document what it is for:

> If you ever want to stop depending on this template — the maintainer
> disappears, you want to fork the pipeline, you no longer trust `@v1` —
> replace your caller workflow with the full build steps and point them
> at your own `scripts/` copy. Your site keeps working with no
> migration.

This costs nothing, removes the single worst objection to central
machinery (a dependency on someone else's repository), and turns dead
weight into a documented exit. `AGENTS.md` must say the local copy is
inert by default so nobody edits it expecting an effect.

The demo site stays on the template repository: it is the gate for
moving `v1`, so it has to keep building.

## Testing

Extending the existing `node --test` suite, no framework:

- **Contract test:** `serializeProject` and `serializeAbout` emit exactly
  the v1 key set — a new key fails until the test is updated deliberately.
- **Rule tests:** no `next/image` import anywhere in `app/`; no
  non-empty `alt` in generated MDX; `next.config.ts` keeps `output:
  'export'` and `trailingSlash: true`.
- **Caller-workflow test:** the example caller in `ARTIST.md` parses as
  valid YAML and references the machinery by a tag, never `@main`.
- The reusable workflow is verified by the template's own deploy, which
  calls it. A green run on the demo site is the gate for moving `v1`.

## Risks

- **Every site depends on `v1`.** A careless move breaks all of them at
  once. Mitigated by moving the tag only after a green demo deploy, and
  by the fact that a broken build leaves the *previous* deploy live —
  Pages does not un-publish on failure.
- **A deleted or renamed template repo breaks every site's build.**
  Accepted; the published sites stay up, only rebuilds stop.
- **Two checkouts make the build slower** by a few seconds. Irrelevant
  against a 46-second run.
- **An artist could still delete their caller workflow.** Nothing
  prevents this, and nothing should — it is their repository.

## Open questions

None outstanding. Both prior open questions are resolved in §7.
