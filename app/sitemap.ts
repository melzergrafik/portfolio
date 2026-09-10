import type { MetadataRoute } from 'next'
import { getProjects } from 'app/projects/utils'
import { absolute } from 'app/lib/site'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = getProjects().map((project) => ({
    url: absolute(`/projects/${project.slug}`),
    lastModified: project.metadata.publishedAt || undefined,
  }))
  return [
    { url: absolute('/') },
    { url: absolute('/projects') },
    { url: absolute('/about') },
    ...projects,
  ]
}
