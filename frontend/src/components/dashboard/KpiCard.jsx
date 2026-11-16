import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import AnimatedNumber from '../ui/AnimatedNumber'

const TONES = { neutral: 'text-ink', danger: 'text-danger', good: 'text-s-done', warn: 'text-p-high' }

/** One metric. `delta` is only passed when the backend supplied both periods, so no trend is ever invented. */
export default function KpiCard({ label, value, format, sub, to, tone = 'neutral', delta, icon: Icon }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {Icon && <Icon size={15} className="text-muted" aria-hidden="true" />}
      </div>
      <p className={`mt-2 font-display text-[28px] font-semibold leading-none ${TONES[tone]}`}><AnimatedNumber value={value} format={format} /></p>
      <p className="mt-2 flex min-h-[18px] items-center gap-1.5 text-xs text-muted">
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${delta > 0 ? 'text-s-done' : delta < 0 ? 'text-danger' : 'text-muted'}`}>
            {delta > 0 ? <ArrowUpRight size={13} /> : delta < 0 ? <ArrowDownRight size={13} /> : <Minus size={13} />}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
        <span className="truncate">{sub}</span>
      </p>
    </>
  )
  const cls = 'card block p-4'
  return to ? <Link to={to} className={`${cls} card-hover focus-visible:ring-2`}>{body}</Link> : <div className={cls}>{body}</div>
}
