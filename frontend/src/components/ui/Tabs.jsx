import { useId } from 'react'
import { motion } from 'framer-motion'
import { spring } from '../../lib/motion'

/** Controlled tab strip with a sliding underline. Pair with a panel that has role="tabpanel". */
export default function Tabs({ tabs, value, onChange, label = 'Views', className = '' }) {
  const group = useId()
  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 overflow-x-auto border-b border-line ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button key={t.value} role="tab" type="button" aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => onChange(t.value)}
            onKeyDown={(e) => {
              const i = tabs.findIndex((x) => x.value === value)
              if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length].value)
              if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length].value)
            }}
            className={`relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}>
            {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-sunken px-1.5 py-0.5 text-[11px] tabular-nums text-muted">{t.count}</span>}
            {active && <motion.span layoutId={`tab-${group}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" transition={spring.snappy} />}
          </button>
        )
      })}
    </div>
  )
}
