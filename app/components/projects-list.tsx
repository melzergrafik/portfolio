import Link from 'next/link'
import { getSortedProjects, getThumbnail } from 'app/projects/utils'

export function ProjectsList() {
  const allProjects = getSortedProjects()

  return (
    <div>
      {allProjects.map((project, idx) => {
        const thumb = getThumbnail(project.metadata.images)
        return (
          <Link
            key={project.slug}
            className="block mb-12"
            href={`/projects/${project.slug}`}
          >
            {thumb ? (
              <div
                className="relative aspect-[3/2] w-full overflow-hidden bg-neutral-100 bg-cover bg-center"
                style={{
                  backgroundImage: thumb.blurDataURL
                    ? `url(${thumb.blurDataURL})`
                    : undefined,
                }}
              >
                <img
                  src={thumb.src}
                  srcSet={thumb.srcset}
                  sizes="(min-width: 1280px) 1280px, 100vw"
                  alt={thumb.alt || project.metadata.title}
                  width={thumb.width}
                  height={thumb.height}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[3/2] w-full bg-neutral-100" />
            )}
            <div className="mt-4 flex flex-col md:flex-row md:items-baseline md:space-x-2">
              <p className="text-neutral-500 text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-medium tabular-nums">
                {project.metadata.year}
              </p>
              <p className="text-neutral-900 text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
                {project.metadata.title}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
