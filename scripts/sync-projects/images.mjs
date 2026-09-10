import sharp from 'sharp'

// Returns { width, height, blurDataURL } for image bytes.
// Blur: downscale to 8px wide JPEG, base64 data URL (~300 bytes).
export async function processImage(bytes) {
  const img = sharp(bytes, { failOn: 'none' })
  const meta = await img.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  const tiny = await sharp(bytes, { failOn: 'none' })
    .resize(8, null, { fit: 'inside' })
    .jpeg({ quality: 40 })
    .toBuffer()

  const blurDataURL = `data:image/jpeg;base64,${tiny.toString('base64')}`
  return { width, height, blurDataURL }
}

// AVIF re-encodes at each requested width, skipping any width above the
// original (upscaling art is worse than serving it at native size). Widths
// are de-duplicated, so a 1000px original yields 640 and 1000, not 640,
// 1000, 1000.
export async function makeVariants(bytes, widths) {
  const meta = await sharp(bytes, { failOn: 'none' }).metadata()
  const native = meta.width ?? 0
  // sharp reports the container as 'heif' for AVIF, so `format` does not
  // discriminate; mediaType is exact.
  const sourceIsAvif = meta.mediaType === 'image/avif'
  const targets = [...new Set(widths.map((w) => Math.min(w, native)))].sort(
    (a, b) => a - b
  )

  const out = []
  for (const width of targets) {
    // An AVIF source at its native width is already the file we would emit.
    // Re-encoding it would be lossy-on-lossy generation loss, and at the widest
    // variant there is no downscale to hide the artifacts. Copy it instead.
    if (sourceIsAvif && width === native) {
      out.push({ width: native, height: meta.height ?? 0, bytes })
      continue
    }
    const buf = await sharp(bytes, { failOn: 'none' })
      .resize(width, null, { fit: 'inside', withoutEnlargement: true })
      .avif({ quality: 55, effort: 4 })
      .toBuffer()
    const vmeta = await sharp(buf).metadata()
    out.push({ width: vmeta.width, height: vmeta.height, bytes: buf })
  }
  return out
}
