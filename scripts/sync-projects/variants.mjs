import { WEB_PREFIX } from './folders.mjs'

export const VARIANT_WIDTHS = [640, 1280, 2400]

// Larger than this and sharp's decode plus three AVIF encodes is slow enough
// to threaten the workflow timeout. Skipping one file is better than losing
// the run.
export const MAX_SOURCE_BYTES = 60 * 1024 * 1024

// Derivative names carry 8 chars of a hash of the source bytes, so a changed
// original yields a new key: "already on disk" therefore means "up to date",
// with nothing to compare. Superseded derivatives are left behind for the
// cache to evict.
export function variantKey(sourceKey, hash, width) {
  const short = String(hash).replace(/"/g, '').slice(0, 8)
  const dot = sourceKey.lastIndexOf('.')
  const stem = dot === -1 ? sourceKey : sourceKey.slice(0, dot)
  return `${WEB_PREFIX}${stem}-${short}-${width}.avif`
}

const encodeKey = (key) => key.split('/').map(encodeURIComponent).join('/')

export function srcsetFor(variants, publicBase) {
  return variants
    .map((v) => `${publicBase}/${encodeKey(v.key)} ${v.width}w`)
    .join(', ')
}

// Derivative names are content-addressed, so re-exporting a source leaves its
// old variants behind forever. Unpruned they accumulate in both the Actions
// cache and the published site, quietly eating the 1 GB Pages budget.
export function orphanKeys(existingKeys, usedKeys) {
  return existingKeys.filter(
    (key) => key.startsWith(WEB_PREFIX) && !usedKeys.has(key)
  )
}
