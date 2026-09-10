import path from 'node:path'

const resolve = (env, fallback) =>
  path.resolve(process.cwd(), process.env[env] || fallback)

export function loadConfig() {
  return {
    // Artist-uploaded originals: one folder per project, plus _about/.
    sourceDir: resolve('SOURCE_DIR', 'content'),
    // Generated AVIF derivatives land under `<publicDir>/_web/`. Gitignored,
    // rebuilt in CI, restored from actions/cache between runs.
    publicDir: resolve('PUBLIC_DIR', 'public'),
    contentDir: resolve('CONTENT_DIR', 'app/projects/items'),
    usageFile: resolve('USAGE_FILE', 'app/usage.json'),
    aboutFile: resolve('ABOUT_FILE', 'app/about.mdx'),
    // Derivatives are served from the site's own origin, so the default is a
    // root-relative path. Set PUBLIC_BASE only for a basePath deployment.
    publicBase: (process.env.PUBLIC_BASE || '').replace(/\/$/, ''),
  }
}
