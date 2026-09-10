import { writeFile, mkdir, appendFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { loadConfig } from './config.mjs'
import {
  listProjectFolders,
  listFolderObjects,
  readObjectBytes,
  readObjectText,
  writeObject,
} from './fs-source.mjs'
import { parseInfo } from './info.mjs'
import { processImage, makeVariants } from './images.mjs'
import {
  variantKey,
  srcsetFor,
  orphanKeys,
  VARIANT_WIDTHS,
  MAX_SOURCE_BYTES,
} from './variants.mjs'
import { serializeProject } from './mdx.mjs'
import { slugify } from './slug.mjs'
import { deriveFromFolderName } from './meta-from-name.mjs'
import { splitFolders, WEB_PREFIX } from './folders.mjs'
import { serializeAbout } from './about.mjs'
import { summarize, formatSummary } from './usage.mjs'

const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i
const PORTRAIT_WIDTHS = [640, 1280]
const basename = (key) => key.split('/').pop()

async function buildProject(config, prefix, existingWeb, usedWeb) {
  const { sourceDir, publicDir, publicBase } = config
  const folderName = prefix.replace(/\/$/, '')
  const objects = await listFolderObjects(sourceDir, prefix)
  const keys = objects.map((o) => o.key)

  // info.md is optional. When absent (or missing fields), fall back to metadata
  // derived from the folder name so the project still publishes. info.md always
  // wins where it provides a value.
  const derived = deriveFromFolderName(folderName)
  const infoKey = keys.find((k) => basename(k).toLowerCase() === 'info.md')
  let fields = {}
  let body = ''
  if (infoKey) {
    ;({ fields, body } = parseInfo(await readObjectText(sourceDir, infoKey)))
  }

  const title = fields.title || derived.title
  if (!title) {
    console.warn(`skip ${folderName}: no title (empty folder name?)`)
    return null
  }

  // Slug (URL + filename): explicit `slug:`, else derived from the title — so
  // the artist never has to rename folders.
  const slug = slugify(fields.slug || title)
  const year = fields.year || derived.year

  const imageKeys = keys.filter((k) => IMAGE_RE.test(k)).sort()
  if (imageKeys.length === 0) {
    console.warn(`skip ${folderName}: no images`)
    return null
  }

  const thumbName = fields.thumbnail ? basename(fields.thumbnail) : null
  const images = []
  for (const key of imageKeys) {
    const source = objects.find((o) => o.key === key)
    if (source.size > MAX_SOURCE_BYTES) {
      console.warn(
        `  skip image ${basename(key)} in ${folderName}: ${Math.round(source.size / 1e6)} MB exceeds the ${Math.round(MAX_SOURCE_BYTES / 1e6)} MB cap — re-export it smaller`
      )
      continue
    }
    try {
      const bytes = await readObjectBytes(sourceDir, key)
      const { width, height, blurDataURL } = await processImage(bytes)

      const planned = VARIANT_WIDTHS.map((w) => ({
        width: Math.min(w, width),
        key: variantKey(key, source.hash, Math.min(w, width)),
      }))
      const unique = [...new Map(planned.map((v) => [v.key, v])).values()]
      for (const v of unique) usedWeb.add(v.key)

      if (unique.some((v) => !existingWeb.has(v.key))) {
        const encoded = await makeVariants(bytes, VARIANT_WIDTHS)
        for (const variant of encoded) {
          const vkey = variantKey(key, source.hash, variant.width)
          if (existingWeb.has(vkey)) continue
          await writeObject(publicDir, vkey, variant.bytes)
          existingWeb.add(vkey)
        }
      }

      const widest = unique[unique.length - 1]
      images.push({
        src: `${publicBase}/${widest.key.split('/').map(encodeURIComponent).join('/')}`,
        srcset: srcsetFor(unique, publicBase),
        width,
        height,
        blurDataURL,
        thumb: thumbName ? basename(key) === thumbName : false,
      })
    } catch (err) {
      // A single unreadable image (e.g. an AVIF that trips libheif's security
      // limits) must not abort the whole project — skip it with a warning.
      console.warn(`  skip image ${basename(key)} in ${folderName}: ${err.message}`)
    }
  }
  if (images.length === 0) {
    console.warn(`skip ${folderName}: no usable images`)
    return null
  }
  if (!images.some((i) => i.thumb)) images[0].thumb = true

  return {
    slug,
    title,
    year,
    publishedAt: fields.published || (year ? `${year}-01-01` : ''),
    summary: fields.summary,
    medium: fields.medium,
    location: fields.location,
    body,
    images,
  }
}

async function buildAbout(config, prefix, existingWeb, usedWeb) {
  const { sourceDir, publicDir, publicBase } = config
  const objects = await listFolderObjects(sourceDir, prefix)
  const keys = objects.map((o) => o.key)
  const infoKey = keys.find((k) => basename(k).toLowerCase() === 'info.md')
  if (!infoKey) {
    console.warn('skip _about: no info.md')
    return null
  }
  const { fields, body } = parseInfo(await readObjectText(sourceDir, infoKey))
  if (!fields.name) {
    console.warn('skip _about: info.md has no `name:` field')
    return null
  }

  let portrait = null
  const imageKey = keys.filter((k) => IMAGE_RE.test(k)).sort()[0]
  const pobj = imageKey ? objects.find((o) => o.key === imageKey) : null
  if (pobj && pobj.size > MAX_SOURCE_BYTES) {
    // Same cap as project images (spec §3). The about file is still written —
    // just without a portrait.
    console.warn(
      `  skip portrait ${basename(imageKey)}: ${Math.round(pobj.size / 1e6)} MB exceeds the ${Math.round(MAX_SOURCE_BYTES / 1e6)} MB cap — re-export it smaller`
    )
  } else if (imageKey) {
    try {
      const bytes = await readObjectBytes(sourceDir, imageKey)
      const { width, height, blurDataURL } = await processImage(bytes)

      // Plan the keys first: if they are all on disk already the
      // derivatives are current, so skip the encode entirely (mirrors
      // buildProject).
      const planned = PORTRAIT_WIDTHS.map((w) => ({
        width: Math.min(w, width),
        key: variantKey(imageKey, pobj.hash, Math.min(w, width)),
      }))
      const pvariants = [...new Map(planned.map((v) => [v.key, v])).values()]
      for (const v of pvariants) usedWeb.add(v.key)

      if (pvariants.some((v) => !existingWeb.has(v.key))) {
        const encoded = await makeVariants(bytes, PORTRAIT_WIDTHS)
        for (const variant of encoded) {
          const vkey = variantKey(imageKey, pobj.hash, variant.width)
          if (existingWeb.has(vkey)) continue
          await writeObject(publicDir, vkey, variant.bytes)
          existingWeb.add(vkey)
        }
      }

      const widest = pvariants[pvariants.length - 1]
      portrait = {
        src: `${publicBase}/${widest.key.split('/').map(encodeURIComponent).join('/')}`,
        srcset: srcsetFor(pvariants, publicBase),
        width,
        height,
        blurDataURL,
      }
    } catch (err) {
      console.warn(`  skip portrait ${basename(imageKey)}: ${err.message}`)
    }
  }

  return {
    name: fields.name,
    tagline: fields.tagline,
    instagram: fields.instagram,
    email: fields.email,
    portrait,
    body,
  }
}

export async function main() {
  const config = loadConfig()
  const allFolders = await listProjectFolders(config.sourceDir)
  const { projects: folders, about: aboutPrefix } = splitFolders(allFolders)
  if (folders.length === 0) {
    console.warn(`No project folders found in ${config.sourceDir}.`)
  }
  await mkdir(config.contentDir, { recursive: true })

  // Restored from actions/cache between runs. A derivative whose key is already
  // here is current by construction, because the key carries the source hash.
  const webObjects = await listFolderObjects(config.publicDir, WEB_PREFIX, {
    hash: false,
  })
  const existingWeb = new Set(webObjects.map((o) => o.key))
  const usedWeb = new Set()

  let written = 0
  for (const prefix of folders) {
    const project = await buildProject(config, prefix, existingWeb, usedWeb)
    if (!project) continue
    const file = path.join(config.contentDir, `${project.slug}.mdx`)
    await writeFile(file, serializeProject(project), 'utf-8')
    const thumb = project.images.find((i) => i.thumb)
    console.log(
      `wrote ${project.slug}.mdx — ${project.images.length} images, thumb: ${basename(
        thumb.src
      )}`
    )
    written++
  }
  console.log(`\nDone. ${written} project(s) written.`)

  if (aboutPrefix) {
    const about = await buildAbout(config, aboutPrefix, existingWeb, usedWeb)
    if (about) {
      await writeFile(config.aboutFile, serializeAbout(about), 'utf-8')
      console.log(`wrote about.mdx — ${about.name}`)
    }
  } else {
    console.warn(
      `No _about/ folder in ${config.sourceDir} — site will show placeholder identity.`
    )
  }

  // Prune before measuring. A re-exported source leaves its old variants
  // behind, and unpruned they ride along into the cache and the published
  // site — so the size report would also be a lie.
  const orphans = orphanKeys([...existingWeb], usedWeb)
  for (const key of orphans) {
    await rm(path.join(config.publicDir, key), { force: true })
  }
  if (orphans.length > 0) {
    console.log(`pruned ${orphans.length} superseded derivative(s)`)
  }

  // What the visitor actually downloads is the built site, so measure the
  // derivatives, not the masters under content/.
  const usage = summarize(
    await listFolderObjects(config.publicDir, WEB_PREFIX, { hash: false })
  )
  const line = formatSummary(usage)
  console.log(line)

  await writeFile(
    config.usageFile,
    JSON.stringify({ ...usage, generatedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  )

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${line}\n`)
  }

  // Warn, never fail. GitHub Pages caps a published site at 1 GB but charges
  // nothing for approaching it, so refusing to deploy would be worse than
  // shipping a large site.
  if (usage.overWarn) {
    console.warn(
      `\nThe built site is past 70% of the 1 GB GitHub Pages limit (${line}).\n` +
        `Re-export the largest originals in content/ smaller, or split them out.`
    )
  }
}

// Only self-invoke when run as a program, so the orchestration above can be
// exercised by a test. Every defect this file has had lived in the wiring
// between the parts, not in the parts.
if (import.meta.main) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
