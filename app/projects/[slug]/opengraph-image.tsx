import { ImageResponse } from 'next/og'
import { getProjects, getAbout } from 'app/projects/utils'

export const dynamic = 'force-static'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Project preview'

// Deliberately text-only. Fetching the artwork here would make every OG image
// a remote dependency, and under `output: export` that failure takes the whole
// build down rather than one route.
export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }))
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = getProjects().find((p) => p.slug === slug)
  const about = getAbout().metadata

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#faf9f7',
          color: '#171717',
          padding: 80,
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, color: '#8c877e' }}>
          {about.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, lineHeight: 1.05 }}>
            {project?.metadata.title ?? about.name}
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: '#8c877e', marginTop: 16 }}>
            {project?.metadata.year ?? ''}
          </div>
        </div>
      </div>
    ),
    size
  )
}
