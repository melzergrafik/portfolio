<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portfolio template rules

## Generated files — never edit these

| Path | Written by | Source of truth |
|---|---|---|
| `app/projects/items/*.mdx` | `scripts/sync-projects` | `content/<project>/` |
| `app/about.mdx` | `scripts/sync-projects` | `content/_about/info.md` |
| `app/usage.json` | `scripts/sync-projects` | measured at build |
| `public/_web/**` | `scripts/sync-projects` | gitignored build output |

Editing any of them looks like it works and is silently reverted by the next
build. To change what a project says, edit `content/<project>/info.md`.

## Hard rules

- **`scripts/` imports nothing from `app/`** and nothing Next-specific. It is a
  plain Node program that writes MDX. A test enforces this.
- **Never invent `alt` text for artwork.** Emit `alt: ''` and let the artist
  fill it in. A wrong description of someone's work is worse than none.
- **No `next/image`.** Width variants are pre-generated as AVIF and rendered
  with a plain `<img srcset>`. Reintroducing `next/image` breaks the static
  export and re-adds a metered dependency.
- **No secrets, ever.** This design has none. If a change seems to need one,
  it is the wrong change.
- **Light mode only.** No `dark:` utilities.
- Tests are `node --test`. No frameworks.

## Adding content

Never by hand. New work is a folder of AVIF images plus an `info.md` under
`content/`, uploaded by the artist. Agents handle text, layout and bugs.
