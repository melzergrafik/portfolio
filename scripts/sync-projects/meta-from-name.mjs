// Derive project metadata from an R2 folder name when no info.md is present.
// Convention seen in the bucket: `<order>-<title-kebab>-<year>-website`, with
// some folders missing the order and/or year (and one using `:website`).
// Examples:
//   "8-lit-2024-website"                  -> { title: 'Lit', year: '2024' }
//   "11-wäscheständer-i-want-to-ii-2025-website" -> { title: 'Wäscheständer I Want To Ii', year: '2025' }
//   "buddiing resistance:website"         -> { title: 'Buddiing Resistance' }

function titleCase(s) {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
}

export function deriveFromFolderName(folderName) {
  let s = folderName.trim()
  // Drop the trailing "website" marker (preceded by -, :, _ or space).
  s = s.replace(/[\s:_-]*website\s*$/i, '')
  // Leading order number, e.g. "11-...".
  const order = s.match(/^(\d+)[\s:_-]+/)
  if (order) s = s.slice(order[0].length)
  // Trailing 4-digit year, e.g. "...-2025".
  let year
  const ym = s.match(/[\s:_-](\d{4})\s*$/)
  if (ym) {
    year = ym[1]
    s = s.slice(0, ym.index)
  }
  const words = s.replace(/[\s:_-]+/g, ' ').trim()
  const title = titleCase(words)
  return { title, year }
}
