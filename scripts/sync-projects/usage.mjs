const MB = 1024 ** 2

// GitHub Pages caps a published site at 1 GB. Unlike R2 there is no cost
// consequence to approaching it, so this warns and never fails the run —
// refusing to deploy because a portfolio got large would be worse than
// shipping it.
export const LIMIT_BYTES = 1024 * MB
export const WARN_BYTES = 716 * MB // 70%

export function summarize(objects) {
  const bytes = objects.reduce((sum, o) => sum + (o.size ?? 0), 0)
  return {
    bytes,
    limit: LIMIT_BYTES,
    pct: Math.round((bytes / LIMIT_BYTES) * 100),
    overWarn: bytes > WARN_BYTES,
  }
}

export function formatSummary(s) {
  return `Site: ${Math.round(s.bytes / MB)} / ${s.limit / MB} MB — ${s.pct}%`
}
