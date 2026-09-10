import { getUsage } from 'app/projects/utils'

const GB = 1024 ** 3

export default function Page() {
  const { bytes, limit, pct, generatedAt } = getUsage()

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter">
        Storage usage
      </h1>
      <p className="mt-4 text-lg tabular-nums">
        {(bytes / GB).toFixed(1)} / {limit / GB} GB ({pct}%)
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        {generatedAt ? `Last synced ${generatedAt}` : 'Not synced yet'}
      </p>
    </section>
  )
}
