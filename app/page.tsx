import { ProjectsList } from 'app/components/projects-list'
import { getAbout } from 'app/projects/utils'

export default function Page() {
  const { name, tagline } = getAbout().metadata

  return (
    <section>
      <h1 className="mb-4 text-4xl sm:text-5xl lg:text-6xl tracking-tighter">
        {name}
      </h1>
      {tagline ? (
        <p className="mb-8 text-lg text-muted max-w-2xl">{tagline}</p>
      ) : null}
      <div className="my-8">
        <ProjectsList />
      </div>
    </section>
  )
}
