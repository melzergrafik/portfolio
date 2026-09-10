import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { sortProjects } from './sort.mjs'

const CONTENT_DIR = path.resolve(
  process.cwd(),
  process.env.CONTENT_DIR ?? 'app/projects/items'
)

export type GalleryImage = {
  src: string
  alt: string
  srcset?: string
  width?: number
  height?: number
  caption?: string
  blurDataURL?: string
  thumb?: boolean
}

export type ProjectMetadata = {
  title: string
  year: string
  publishedAt: string
  summary: string
  medium?: string
  location?: string
  image?: string
  images?: GalleryImage[]
}

type RawImage = string | (Partial<GalleryImage> & { src: string })

function normalizeImage(raw: RawImage): GalleryImage {
  if (typeof raw === 'string') return { src: raw, alt: '' }
  return { alt: '', ...raw }
}

export function getThumbnail(
  images?: GalleryImage[]
): GalleryImage | undefined {
  if (!images || images.length === 0) return undefined
  return images.find((img) => img.thumb) ?? images[0]
}

function readProject(filePath: string): {
  metadata: ProjectMetadata
  content: string
} {
  const file = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(file)
  const images = Array.isArray(data.images)
    ? (data.images as RawImage[]).map(normalizeImage)
    : undefined
  return {
    metadata: { ...(data as ProjectMetadata), images },
    content,
  }
}

export function getProjects() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => path.extname(f) === '.mdx')
    .map((file) => {
      const { metadata, content } = readProject(path.join(CONTENT_DIR, file))
      return { metadata, slug: path.basename(file, '.mdx'), content }
    })
}

export function getSortedProjects() {
  return sortProjects(getProjects())
}

export type About = {
  name: string
  tagline?: string
  instagram?: string
  email?: string
  portraitSrc?: string
  portraitSrcset?: string
  portraitWidth?: number
  portraitHeight?: number
  portraitBlur?: string
}

export function getAbout(): { metadata: About; content: string } {
  const file = path.join(process.cwd(), 'app', 'about.mdx')
  const { data, content } = matter(fs.readFileSync(file, 'utf-8'))
  return { metadata: data as About, content }
}

export type Usage = {
  bytes: number
  limit: number
  pct: number
  overWarn?: boolean
  generatedAt?: string
}

const NO_USAGE: Usage = { bytes: 0, limit: 1024 * 1024 ** 2, pct: 0 }

// usage.json is generated, so a fresh clone may not have it yet and a killed
// sync run can leave it empty. Reporting zero costs one stale number on one
// page; throwing takes down the entire static export with "Unexpected end of
// JSON input", which says nothing about where to look.
export function getUsage(): Usage {
  const file = path.join(process.cwd(), 'app', 'usage.json')
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
    if (!parsed || typeof parsed.bytes !== 'number') return NO_USAGE
    return { ...NO_USAGE, ...parsed }
  } catch {
    return NO_USAGE
  }
}
