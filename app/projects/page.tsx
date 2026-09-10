import { ProjectsList } from 'app/components/projects-list'

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-3xl sm:text-5xl font-bold tracking-tighter">
        Projects
      </h1>
      <ProjectsList />
    </section>
  )
}
