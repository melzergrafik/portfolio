import Link from 'next/link'

const navItems = {
  '/': {
    name: 'home',
  },
  '/projects': {
    name: 'projects',
  },
  '/about': {
    name: 'about',
  },
}

export function Navbar() {
  return (
    <aside className="sticky top-0 z-40 -mx-2 mb-12 bg-white/90 px-2 backdrop-blur-sm tracking-tight md:mx-0 md:px-0">
      <nav className="flex flex-row items-center py-3" id="nav">
        <div className="flex flex-row space-x-2 -ml-2">
          {Object.entries(navItems).map(([path, { name }]) => {
            return (
              <Link
                key={path}
                href={path}
                className="text-lg font-semibold text-neutral-400 transition-colors hover:text-black flex align-middle relative py-1 px-2"
              >
                {name}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
