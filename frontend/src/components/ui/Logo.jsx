export function LogoMark({ size = 28, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="rgb(var(--primary))" />
      <g fill="none" strokeWidth="2.6" strokeLinecap="round">
        <path d="M15 27C14 20 11 14 6 10" stroke="rgb(var(--primary-ink))" />
        <path d="M17 27C18 20 21 14 26 10" stroke="rgb(var(--primary-ink))" />
        <path d="M16 27C16 20 16 13 16 5" stroke="rgb(var(--accent))" />
      </g>
    </svg>
  )
}

export default function Logo({ size = 28, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">Marram</span>
    </span>
  )
}
