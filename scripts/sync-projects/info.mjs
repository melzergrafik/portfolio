export function parseInfo(text) {
  const all = text.replace(/\r\n/g, '\n').split('\n')

  // Accept both `key: value` lines terminated by `---` and a YAML-style fenced
  // block. Every markdown editor writes the fenced form, so an artist will
  // produce it far more often — and dropping the fields silently would surface
  // as a project with no summary and no clue why.
  const first = all.findIndex((l) => l.trim() !== '')
  const fenced = first !== -1 && all[first].trim() === '---'
  const lines = fenced ? all.slice(first + 1) : all

  const sepIndex = lines.findIndex((l) => l.trim() === '---')
  const headerLines = sepIndex === -1 ? lines : lines.slice(0, sepIndex)
  const bodyLines = sepIndex === -1 ? [] : lines.slice(sepIndex + 1)

  const fields = {}
  for (const line of headerLines) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (key) fields[key] = value
  }

  const body = bodyLines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '')
  return { fields, body }
}
