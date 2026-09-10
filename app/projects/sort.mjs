// Year descending, publishedAt as tiebreak. Undated projects sort last
// rather than jumping to the top as an empty string would.
export function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const ay = Number(a.metadata.year) || -Infinity
    const by = Number(b.metadata.year) || -Infinity
    if (ay !== by) return by - ay
    return String(b.metadata.publishedAt).localeCompare(
      String(a.metadata.publishedAt)
    )
  })
}
