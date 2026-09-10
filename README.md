# artist-portfolio-template

A portfolio site for an artist who has never opened a terminal. They drop AVIF
files and a markdown file into `content/`, commit, and the site rebuilds.

**Everything is GitHub** — code, content, CI, hosting, issues, Copilot. One
service, one login, and on a public repo **no billing dimension exists at all**:
there is no pay-as-you-go option to decline and no spend cap to wish for.

## How it works

```
content/<project>/*.avif  ──▶  scripts/sync-projects  ──▶  app/projects/items/*.mdx
content/_about/info.md                 │                    app/about.mdx
                                       └──────────────────▶ public/_web/*.avif  (gitignored)
                                                                    │
                                          next build --output export ▼
                                                          GitHub Pages
```

`scripts/sync-projects` is a plain Node program — it imports nothing from
`app/`, and a test enforces that. It walks `content/`, emits AVIF width variants
and writes MDX. The app only ever reads generated MDX.

**Derivatives are never committed.** They are built in CI, cached in
`actions/cache` under a key carrying a hash of the source bytes, and shipped to
Pages as a build artifact. So there is no `gh-pages` branch and no bot commit.

**AVIF sources are copied, not re-encoded**, at their native width. Lossy AVIF
into lossy AVIF is generation loss, and it shows worst on the largest variant.

## A new site

The artist owns their repo; the maintainer owns this template. Personal accounts
own repos alone — collaborators get read+write and nothing more — so the three
steps that need owner rights are the artist's:

1. **Use this template** → name it `<username>.github.io`, Public.
2. **Settings → Pages → Source: GitHub Actions.**
3. Optional: **Settings → Collaborators →** add the maintainer.

Step 2 is the only one that cannot be templated. The workflow itself copies
with the template, but Pages' build source is a repository *setting*, and
`GITHUB_TOKEN` has no `administration` scope — so no workflow can enable it for
itself. `configure-pages`' `enablement` input needs a PAT, which would put back
the only secret this design deleted. The workflow instead fails fast with a
plain-English message telling the artist exactly which toggle to flip.

Nothing to run on the maintainer's side — GitHub lists repos generated from a
template, so there is no registry to keep. Optionally seed a starter backlog:

```bash
bash scripts/create-issues.sh <owner>/<repo>
```

A repo named anything other than `<username>.github.io` becomes a project site
under `/<repo>`; the template handles that automatically from
`configure-pages`' `base_path`.

## Limits

| Limit | Value | Binding? |
|---|---|---|
| Published site | 1 GB | **yes** — the real ceiling |
| Source repo | 1 GB recommended | yes, on originals |
| Bandwidth | 100 GB/month (soft) | no |
| Actions cache | 10 GB/repo, 7-day eviction | no |
| Browser upload | 25 MB/file, 100 files | no |

At AVIF and ≤4000px that ceiling is a few thousand images. `/usage` on each site
reports where it stands; the build warns past 70% and never fails.

## Known gaps

- **No PR previews.** Vercel gave these free; Pages does not. The
  issue → Copilot → PR loop has no live preview.
- **Public repos only.** Pages on a private repo needs a paid plan.
- **Git history keeps originals** even after deletion. If a site ever nears
  1 GB, move originals to a second private repo and check out both.

## Development

```bash
mise install
pnpm install
node scripts/sync-projects/index.mjs   # content/ -> MDX + public/_web
pnpm dev
pnpm test:scripts
```

See `AGENTS.md` for the rules any agent working here must follow, and
`ARTIST.md` for what the artist is told.
