// Set by the deploy workflow from the repo's own Pages URL, so a new site
// needs no configuration to get correct canonical URLs. A custom domain
// overrides it by setting the same variable.
export const baseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

// `trailingSlash: true` means Pages serves /projects/x/ — so canonical URLs and
// the sitemap must carry the slash too, or every one of them points at a URL
// that 308-redirects. Files (anything with an extension) keep their bare form.
export function absolute(pathname: string) {
  const last = pathname.split('/').pop() ?? ''
  const withSlash =
    last.includes('.') || pathname.endsWith('/') ? pathname : `${pathname}/`
  // Strip the leading slash: an absolute path resolves against the ORIGIN and
  // silently discards the base path, so on a project site every canonical URL
  // and sitemap entry would point at a 404.
  return new URL(withSlash.replace(/^\//, ''), `${baseUrl}/`).toString()
}
