import { getAbout } from 'app/projects/utils'

export default function Footer() {
  const { instagram, email } = getAbout().metadata
  const socials = [
    instagram && { label: 'Instagram', href: instagram },
    email && { label: 'Email', href: `mailto:${email}` },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <footer className="mb-16 mt-12 text-sm font-medium text-neutral-500">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>© {new Date().getFullYear()}</span>
        {socials.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="underline decoration-neutral-400 underline-offset-2"
            target={s.href.startsWith('http') ? '_blank' : undefined}
            rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {s.label}
          </a>
        ))}
      </div>
    </footer>
  )
}
