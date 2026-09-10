# Artist portfolio template — design

Date: 2026-09-05 (revised 2026-09-06: consolidated onto GitHub)
Status: approved (brainstorm), implementation in progress

## Problem

Making a portfolio site for a friend is a recurring task. Dave's site
already has every runtime piece: content-backed MDX generation, a
project list sorted newest-first, and a gallery with a keyboard-driven
lightbox.

Three things stop it from being reusable:

1. **The sync only runs when the maintainer runs it**, locally, with
   credentials. The artist cannot publish alone.
2. **The artist's identity is hardcoded** — a literal "Artist Portfolio"
   heading, an empty `socials` array, and no about page at all.
3. **Nothing is templated.** A second site means copying files by hand.

Everything must stay on free tiers, and must be structurally unable to
incur a charge.

## Goal

One command creates a new artist's site. From then on the artist drags a
folder of AVIF images and an `info.md` into the GitHub web UI, commits,
and their site rebuilds. They never open an editor for code.

## Non-goals

- Multi-tenant single deployment (revisit at ~5 artists)
- A CMS or admin UI
- Per-artist theming beyond content
- Non-Next.js templates (Next.js only, by decision)
- PR preview deployments (see Open risks)

## Architecture

### 0. One account

**Everything is GitHub.** Code, content, CI, hosting, issue tracking and
Copilot are one service and one login.

The two alternatives were considered and rejected:

- **Cloudflare-only** — R2 plus Workers can host, but Cloudflare has no
  git hosting and no issue tracker, so GitHub is needed anyway. R2 is
  also the one service in the stack with *no spend cap*.
- **Vercel-only** — no issue tracker, and deploys still want a git remote.

GitHub is the only one of the three that covers all five jobs.

**Account shape:** personal accounts only, no organizations.

- The **maintainer owns the template repo**, public, with the template flag
  set.
- Each **artist owns their own site repo**, created from the template with
  "Use this template" under their own personal account, public.
- The artist adds the maintainer as a **collaborator**.

Repositories owned by a personal account have exactly two permission
levels: owner (full control) and collaborator (read + write, nothing
more). There is no admin collaborator outside an organization. So the
maintainer can push code, edit content and open PRs on an artist's repo,
but **cannot change its settings** — enabling Pages, renaming, deleting.
Those stay with the artist. This is the accepted cost of avoiding orgs.

Naming the repo `<username>.github.io` yields a user site at that bare
domain. Any other name yields a project site under `/<repo>`; the
template handles both by taking `basePath` and the generator's
`PUBLIC_BASE` from `configure-pages`' `base_path` output, so a repo
called `portfolio` works exactly as well. Without that, every image and
stylesheet 404s.

**What this deletes from the previous design:** the R2 bucket, the S3
client, the four repo secrets, the Cloudflare budget alert, the 8 GB
quota guard, the Vercel project, the Vercel 1000-image optimization cap,
and every account signup but one.

**What it costs:** the repo must be public (Pages on a private repo needs
Pro), and there are no PR preview deployments.

### 1. Template repository

A **new** repo, `artist-portfolio-template`, scaffolded fresh with
`pnpm create next-app@16.3.4` (TypeScript, App Router, Tailwind 4.3.3
stable). It is not a fork: the old repo descends from the Vercel blog
starter and carries Tailwind 4.0.0-alpha.13 and starter-blog leftovers.

`next.config.ts` sets `output: 'export'`. Every route is static:
`/`, `/projects`, `/projects/[slug]` (via `generateStaticParams`),
`/about`, `/usage`. No server rendering is used or needed.

GitHub's "Template repository" flag is set; new sites come from
`gh repo create --template`. No per-site code changes: everything
artist-specific lives under `content/`.

`mise.toml` pins node and pnpm. Nothing is installed globally.

### 2. Content model

All artist content lives in the repo under `content/`, one folder per
project, plus one reserved folder:

- **`content/<project>/`** — images and `info.md` (frontmatter: `title`,
  `year`, `summary`).
- **`content/_about/`** — `info.md` (frontmatter: `name`, `tagline`,
  `instagram`, `email`; body: the bio) and one image (the portrait).
  Sync emits `app/about.mdx`, which feeds the home heading, `/about`,
  the footer socials, and OG metadata.

Folders whose name starts with `_` are excluded from the project list.
This is the whole configuration surface: the artist changes their own
name, bio and links by editing one markdown file in the GitHub web UI,
and the repo holds no per-site values anywhere else.

### 3. Image pipeline

**Artists are advised to upload AVIF only.** Image quality is the whole
product, and AVIF sources are 5–10× smaller than JPEG, which moves the
repo ceiling (§6) from a few hundred images to a few thousand.

`scripts/sync-projects` reads every source file and probes dimensions
with `sharp`. It emits 2–3 width variants per image into `_web/`:

- **AVIF pass-through.** If the source is already AVIF and the target
  width is ≥ the source width, the file is **copied, not re-encoded**.
  Re-encoding lossy AVIF to lossy AVIF is generation loss, and it shows
  worst at the largest variant where there is no downscale to hide it.
- Narrower widths are downscaled and encoded normally; downscaling
  discards the artifacts that would otherwise compound.
- Non-AVIF sources are converted.
- Originals under `content/` are left untouched — they are the artist's
  masters, and the repo is their offsite backup.

Variants are referenced from the generated MDX and rendered with a plain
`<img srcset sizes>`, never `next/image` (which builds its own srcset and
ignores a supplied one; `unoptimized` would drop responsive widths
entirely). `blurDataURL` placeholders are unaffected.

**Derivatives are never committed.** `_web/` is gitignored. Committing
generated binaries would rewrite hundreds of files on any quality or
width change, and git keeps every previous copy forever. They are built
in CI and shipped straight to Pages as a build artifact (§4).

**Derivative caching.** Because nothing is committed, a cold build would
re-encode everything — ~900 encodes for a 300-image portfolio. Variant
filenames stay content-hash-keyed (`<stem>-<hash8>-<width>.avif`), so
"key exists ⇒ derivative is current" with no metadata lookup. The store
behind that key is `actions/cache` (10 GB per repo, entries evicted after
7 days unused) instead of a bucket. Worst case — a 7-day-idle eviction —
costs one slow build.

Guard: skip and warn on any single source above a size cap rather than
letting one oversized file fail the whole run.

### 4. Build and deploy workflow

`.github/workflows/deploy.yml`:

- Triggers: `push` to `main` and `workflow_dispatch`. No cron — content
  arrives as a commit, so the commit is the trigger.
- Restores the `_web/` cache, runs `scripts/sync-projects` (writes
  `app/projects/items/*.mdx`, `app/about.mdx`, `app/usage.json`, and the
  `_web/` derivatives), saves the cache, runs `next build`.
- Publishes with `actions/upload-pages-artifact` + `actions/deploy-pages`.
  There is no `gh-pages` branch and no bot commit anywhere in the loop.

**Zero secrets.** The workflow authenticates with the built-in
`GITHUB_TOKEN` and reads nothing else. There is no `.env` file, no repo
secret, and nothing to rotate.

Repos are public, so Actions minutes are free and unmetered.

### 5. Ordering

Sort the project list by `year` descending, with `publishedAt` as
tiebreaker. The card links straight to the project page, and the lightbox
has prev/next, arrow keys and Escape.

### 6. Cost containment

**GitHub Pages on a public repo has no billing dimension at all.** There
is no pay-as-you-go option to reject, no budget alert to configure, and
no spend cap to wish for. This is structural rather than configured, and
it is the main reason to consolidate.

The limits are capacity limits, not cost limits, and exceeding them
degrades rather than bills:

| Limit | Value | Binding? |
|---|---|---|
| Published site | 1 GB | **yes** — the real ceiling |
| Source repo | 1 GB recommended | yes, on originals |
| Bandwidth | 100 GB/month (soft) | no |
| Actions cache | 10 GB/repo | no |
| Deploy timeout | 10 min | no (build job is separate) |
| Browser file upload | 25 MiB/file, 100 files at once | no |
| Git hard block | 100 MiB/file | no |

At the "AVIF, ≤4000px" guidance the 1 GB ceiling is a few thousand
images. Most of these portfolios are under 100.

No payment method is added to the GitHub account; the Actions spending
limit stays at its $0 default.

### 7. Usage visibility

The sync run sums `content/` and `_web/` sizes and writes them two ways:
a line in the Actions job summary (`Site: 180 / 1024 MB — 18%`), and
`app/usage.json` rendered at `/usage`. It warns above 70% of the site
limit. No extra API calls or services.

### 8. Artist tooling and docs

- **Uploading:** drag files into the GitHub web UI, commit. 25 MiB per
  file, 100 files at a time.
- **Writing:** the GitHub web editor for small edits; Obsidian (free)
  opened on a local clone for longer bios. The local clone doubles as the
  artist's own backup.
- **Images:** export to AVIF at ≤4000px. `ARTIST.md` points at
  squoosh.app for anyone whose editor cannot write AVIF.
- **`ARTIST.md`:** upload a folder, write `info.md`, commit, wait two
  minutes. Also published as a shareable web page per artist so they can
  bookmark it instead of navigating GitHub.

### 9. Issue-driven changes (GitHub Projects + Copilot)

Free on a public repo with GitHub Free and Copilot Free. The template
adds `.github/copilot-instructions.md` pointing at `AGENTS.md`, and issue
forms for "change some text", "something looks wrong", and "about-page
detail" so a non-coder files something an agent can act on.
`scripts/create-issues.sh` seeds a per-site backlog.

**Rule, stated in `ARTIST.md`:** content never goes through Copilot. New
series are direct uploads to `content/`. Copilot handles text, design and
bugs only — hand-written MDX under `app/projects/items/` would be
overwritten by the next sync.

### 10. Bootstrap

Setup splits along the ownership line, because the artist owns their repo
and only the owner can change its settings.

**The artist does three things in the web UI** (documented with
screenshots in `ARTIST.md`):

1. Open the template repo, click **Use this template**, name it
   `<username>.github.io`, keep it **Public**.
2. **Settings → Pages → Source: GitHub Actions.** This one cannot be
   automated: `configure-pages` can self-enable Pages, but only with a
   personal access token, and minting a PAT for a non-coder to avoid one
   click is a bad trade — it would also reintroduce the only secret this
   design has managed to delete.
3. **Settings → Collaborators →** add the maintainer.

Their first content upload is a push, which runs the workflow and puts
the site live. Nothing else is needed.

**The maintainer runs nothing.** GitHub lists the repositories generated
from a template, so there is no registry to maintain and no reason for a
provisioning script. `scripts/create-issues.sh <owner>/<repo>` is
available to seed a starter backlog, and is optional.

No secret is set, because none exists.

### 11. Reproducibility

The template holds no per-site values at all, so "Use this template" twice
produces two working sites with no hand-editing in between. That is the
point of moving identity into `content/_about/` rather than a per-site
config file, and of deriving the site URL and base path from
`configure-pages` rather than committing them.

Only Next.js is supported. One rule survives from the multi-framework
idea because it is cheap and keeps the generator honest: **`scripts/`
imports nothing from `app/`**. It is a plain Node program that writes MDX
and knows nothing about the site rendering it. Input and output
directories come from env vars rather than hardcoded paths.

### 12. Provisioning and secrets

There are **no application secrets in this design.** The build uses the
built-in `GITHUB_TOKEN`; nothing is stored, pushed, or rotated. `.env`
files do not exist, and no repo secret is ever set.

**1Password has no role in the default flow, and that is worth stating
plainly** because it was a stated requirement earlier. The vault-per-artist
was designed for a world where the maintainer created each artist's
accounts and mailed them the passwords. Artists now sign up themselves and
own their own repos, so there is no credential for the maintainer to hold —
and GitHub already lists which repos came from the template, so there is
nothing to record either.

The vault-with-generated-password flow (`op item create
--generate-password`, `op item share --emails --expires-in 7d`) remains the
right answer *if* a maintainer ever creates an account on an artist's
behalf. It is documented, not wired in.

**Manual steps that cannot be automated** (~5 minutes):

1. The artist's own GitHub signup, if they do not have one.
2. The three web-UI clicks in §10.

### 13. SEO

Built properly on the fresh scaffold rather than inherited from a blog
starter:

- `generateMetadata` per project, derived from frontmatter (title,
  summary, canonical URL).
- Base URL comes from the site's own domain (`<artist>.github.io` or a
  CNAME), read from one place.
- File-based `opengraph-image` per project, generated at build time.
- `sitemap.ts` and `robots.ts`.
- JSON-LD: a `VisualArtwork` per project nested under a `Person` for the
  artist. This is the schema that matters for artists; the blog starter
  emits `BlogPosting`, which is wrong for this content.

## Testing

`node --test`, no framework:

- `_`-prefixed folders are excluded from the project list
- `content/_about/info.md` produces the expected `about.mdx`
- variant generation emits the expected widths and srcset
- **AVIF pass-through**: an AVIF source at or below the target width is
  copied byte-for-byte, not re-encoded
- the size guard skips an oversized source and warns
- year-descending sort, including the tie case
- `scripts/` has no import from `app/` (guard test)

The workflow is verified by running it once end to end during
implementation, with a second run confirming the cache makes it a no-op.

## Open risks

- **No PR previews.** The "artist files an issue → Copilot opens a PR"
  loop has no live preview to look at, which Vercel gave for free. Fixable
  with a workflow that publishes PR builds to a subpath; not built now.
- **Public repo.** Unpublished or WIP pieces in `content/` are visible to
  anyone. Stated plainly in `ARTIST.md`.
- **Originals bloat git history.** Deletions do not shrink it. The
  ≤4000px AVIF guidance plus the §7 warning is the mitigation. If an
  artist does hit 1 GB, originals move to a second private repo under the
  same org and the workflow checks out both — not built now.
- **Cold-cache build time.** A 7-day gap evicts the cache and forces a
  full re-encode. Slow, not broken.
