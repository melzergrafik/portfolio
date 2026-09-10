# Your site

Everything on your site comes from one folder: **`content/`**. You never touch
code. Upload images, write a bit of text, and the site rebuilds itself in about
two minutes.

## Setting it up (once)

1. On the template repo, click **Use this template → Create a new repository**.
   Name it **`yourusername.github.io`** and keep it **Public**.
2. In your new repo: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**. This is the only setting you have to change — everything
   else, including the machinery that builds the site, came with the template.
3. Optional: **Settings → Collaborators →** add whoever set this up for you, if
   you want them to be able to help.

That's it. Your first upload puts the site live.

If you skip step 2, the build stops and tells you so in plain English — nothing
breaks, just turn it on and click **Re-run** on the Actions tab.

## Adding a project

A project is one folder inside `content/`. Make one, put your images in it plus
a file called `info.md`:

```
content/
  blue-hour/
    info.md
    01-first.avif
    02-second.avif
```

`info.md` looks like this:

```
---
title: Blue Hour
year: 2026
summary: One sentence about the series.
---

As much or as little as you want to write. This appears on the project page.
```

Images show in the order their filenames sort, so `01-`, `02-` prefixes put them
in the order you want. Newest **year** goes to the top of your homepage.

To upload: open the folder on GitHub, **Add file → Upload files**, drag them in,
and click **Commit changes**. Two minutes later it's live.

## Your about page

`content/_about/info.md`. Your name, tagline and links are at the top; your bio
goes underneath. Drop a portrait photo in that folder and it appears too.

## Export your images as AVIF, max 4000px wide

This matters more than anything else here.

- **AVIF** is what the site serves. If you upload AVIF, your largest image is
  copied through untouched — no quality is lost at all. Upload a JPEG and it
  gets converted, which costs a little quality.
- **Max 4000px** on the long edge. Bigger is not sharper on a screen, and the
  whole site has to fit in 1 GB.
- Lightroom, Capture One, Affinity and Photoshop all export AVIF. If yours
  doesn't, drop the file into [squoosh.app](https://squoosh.app), pick AVIF,
  download.

Two hard limits from GitHub: **25 MB per file** and **100 files per upload**.
Both are far above a properly exported AVIF.

## Things worth knowing

- **Your repo is public.** Anything you put in `content/` can be seen by anyone,
  including work you haven't announced. Don't upload what isn't ready.
- **Delete `content/welcome/`** once you've uploaded something of your own.
- **Never ask Copilot to add artwork.** New work is always an upload. Copilot is
  for text, layout and bugs — anything it writes into `app/projects/items/` is
  erased by the next build.
- **Check `/usage` on your own site** to see how much of the 1 GB you've used.
- **Ignore any "available to import and deploy" email** from Vercel, Netlify or
  similar. They watch for new projects and offer to host them. Your site is
  already hosted by GitHub for free — importing it elsewhere gives you a second,
  half-working copy at a different address and something that can start costing
  money.

## Asking for changes

Open an **Issue** on your repo. There are three ready-made forms: change some
text, something looks wrong, and about-page detail. Fill one in and either do it
yourself with Copilot or leave it for whoever set this up.
