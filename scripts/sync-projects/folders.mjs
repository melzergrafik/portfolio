export const ABOUT_PREFIX = '_about/'
export const WEB_PREFIX = '_web/'

// Reserved folders are machine-owned (_web) or configuration (_about) and
// never appear as projects.
export function isReservedFolder(prefix) {
  return prefix.startsWith('_')
}

export function splitFolders(prefixes) {
  return {
    projects: prefixes.filter((p) => !isReservedFolder(p)),
    about: prefixes.find((p) => p === ABOUT_PREFIX) ?? null,
  }
}
