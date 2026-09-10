import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAbout } from 'app/projects/utils'

export default function Page() {
  const { metadata, content } = getAbout()
  const socials = [
    metadata.instagram && { label: 'Instagram', href: metadata.instagram },
    metadata.email && { label: metadata.email, href: `mailto:${metadata.email}` },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <section className="max-w-2xl">
      {metadata.portraitSrc ? (
        <img
          src={metadata.portraitSrc}
          srcSet={metadata.portraitSrcset}
          sizes="(min-width: 640px) 24rem, 100vw"
          alt={metadata.name}
          width={metadata.portraitWidth}
          height={metadata.portraitHeight}
          decoding="async"
          className="mb-8 w-full max-w-sm h-auto bg-neutral-100 bg-cover bg-center"
          style={{
            backgroundImage: metadata.portraitBlur
              ? `url(${metadata.portraitBlur})`
              : undefined,
          }}
        />
      ) : null}
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter">
        {metadata.name}
      </h1>
      {metadata.tagline ? (
        <p className="mt-2 text-lg text-neutral-700">{metadata.tagline}</p>
      ) : null}
      <article className="prose mt-6">
        <MDXRemote source={content} />
      </article>
      {socials.length > 0 ? (
        <ul className="mt-8 flex flex-wrap gap-x-4 text-sm font-medium text-neutral-500">
          {socials.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                className="underline decoration-neutral-400 underline-offset-2"
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel={
                  s.href.startsWith('http') ? 'noopener noreferrer' : undefined
                }
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
