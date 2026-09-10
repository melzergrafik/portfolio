export function sortProjects<
  T extends { metadata: { year: string; publishedAt: string } },
>(projects: T[]): T[]
