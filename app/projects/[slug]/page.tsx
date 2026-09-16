import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { Gallery } from 'app/components/gallery'
import { getProjects, getAbout, getThumbnail } from 'app/projects/utils'
import { absolute, baseUrl } from 'app/lib/site'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = getProjects().find((p) => p.slug === slug)
  if (!project) return {}
  const { title, summary, publishedAt } = project.metadata
  const url = absolute(`/projects/${slug}`)
  return {
    title,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description: summary,
      publishedTime: publishedAt,
      url,
    },
  }
}

// Required by `output: export`: Pages serves static files, so every project
// route is enumerated and prerendered at build time.
export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = getProjects().find((p) => p.slug === slug)
  if (!project) notFound()
  const { metadata, content } = project
  const about = getAbout().metadata
  const thumb = getThumbnail(metadata.images)

  // VisualArtwork under Person is the schema that fits artwork. The blog
  // starter this kit replaces emitted BlogPosting, which is simply wrong here.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: metadata.title,
    dateCreated: metadata.year,
    artMedium: metadata.medium,
    locationCreated: metadata.location,
    abstract: metadata.summary,
    url: absolute(`/projects/${slug}`),
    image: thumb ? absolute(thumb.src) : undefined,
    creator: {
      '@type': 'Person',
      name: about.name,
      url: baseUrl,
      sameAs: [about.instagram].filter(Boolean),
    },
  }

  return (
    <section className="max-w-7xl mx-auto w-full">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl sm:text-5xl tracking-tighter">
        {metadata.title}
      </h1>
      <p className="mt-2 text-muted tabular-nums">
        {[metadata.year, metadata.medium, metadata.location]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <Gallery images={metadata.images ?? []} fallbackAlt={metadata.title} />
      <article className="prose max-w-2xl">
        <MDXRemote source={content} />
      </article>
    </section>
  )
}
