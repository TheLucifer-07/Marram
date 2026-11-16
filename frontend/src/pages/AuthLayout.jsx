import { Link } from 'react-router-dom'
import Logo from '../components/ui/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'

/** Original artwork: marram grass blades over dune contours. */
export function GrassArt({ className = '' }) {
  const blades = [[60, 280, 40, 150], [110, 280, 128, 110], [160, 280, 150, 70], [210, 280, 232, 120], [260, 280, 250, 160], [310, 280, 338, 130], [350, 280, 340, 190]]
  return (
    <svg viewBox="0 0 400 300" className={className} fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
      <path d="M0 262C70 236 140 270 210 250S340 232 400 256" strokeWidth="2" opacity=".35" />
      <path d="M0 284C80 262 150 292 230 274S350 262 400 280" strokeWidth="2" opacity=".2" />
      {blades.map(([x1, y1, x2, y2], i) => <path key={i} d={`M${x1} ${y1}C${x1} ${y1 - (y1 - y2) * 0.55} ${x2 - (x2 - x1) * 0.2} ${y2 + 40} ${x2} ${y2}`} strokeWidth={i === 2 ? 5 : 4} opacity={i === 2 ? 1 : 0.7} stroke={i === 2 ? 'rgb(var(--accent))' : 'currentColor'} />)}
    </svg>
  )
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <header className="flex items-center justify-between"><Link to="/" aria-label="Marram home"><Logo /></Link><ThemeToggle /></header>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-muted">{footer}</p>
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-primary text-primary-ink lg:block">
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <p className="max-w-xs font-display text-3xl font-semibold leading-tight">Dunes shift. Marram roots hold them together.</p>
          <GrassArt className="w-full max-w-md self-end text-primary-ink/90" />
          <p className="max-w-sm text-sm opacity-80">Marram gives small teams the same hold: one workspace, a clear owner for every task, and a history nobody can quietly rewrite.</p>
        </div>
      </aside>
    </div>
  )
}
