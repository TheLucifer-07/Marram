import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META } from '../../lib/constants'
import { formatShortDate } from '../../lib/format'

const tip = { background: 'rgb(var(--raised))', border: '1px solid rgb(var(--line))', borderRadius: 8, color: 'rgb(var(--ink))', fontSize: 12, boxShadow: 'var(--elev-2)' }
const axis = { fill: 'rgb(var(--muted))', fontSize: 11 }
const col = (hex) => `rgb(${hex})`

export function StatusDonut({ byStatus, total }) {
  const data = STATUSES.map((s) => ({ key: s, name: STATUS_META[s].label, value: byStatus[s] ?? 0 })).filter((d) => d.value > 0)
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row md:flex-col">
      <div className="relative h-40 w-40 shrink-0" role="img" aria-label={STATUSES.map((s) => `${STATUS_META[s].label}: ${byStatus[s] ?? 0}`).join(', ')}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive animationDuration={700}>
              {data.map((d) => <Cell key={d.key} fill={col(STATUS_META[d.key].hex)} />)}
            </Pie>
            <Tooltip contentStyle={tip} formatter={(v, n) => [`${v} tasks`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold tabular-nums">{total}</span><span className="text-[11px] text-muted">tasks</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {STATUSES.map((s) => {
          const n = byStatus[s] ?? 0
          return (
            <li key={s} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[s].cls}`} />{STATUS_META[s].label}</span>
              <span className="tabular-nums text-muted">{n}<span className="ml-1.5 text-xs">{total ? Math.round((n / total) * 100) : 0}%</span></span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function PriorityBars({ byPriority }) {
  const data = PRIORITIES.map((p) => ({ key: p, name: PRIORITY_META[p].label, value: byPriority[p] ?? 0 }))
  return (
    <div className="h-36" role="img" aria-label={data.map((d) => `${d.name}: ${d.value}`).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={58} tickLine={false} axisLine={false} tick={axis} />
          <Tooltip cursor={{ fill: 'rgb(var(--sunken))' }} contentStyle={tip} formatter={(v) => [`${v} tasks`, 'Count']} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14} animationDuration={600}>
            {data.map((d) => <Cell key={d.key} fill={col(PRIORITY_META[d.key].hex)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendChart({ points }) {
  const data = points.map((p) => ({ ...p, label: formatShortDate(p.date) }))
  return (
    <div className="h-44" role="img" aria-label={`Tasks completed per day over the last 14 days: ${points.map((p) => p.completed).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -18, right: 8, top: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.28} /><stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} interval={2} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axis} width={36} />
          <Tooltip contentStyle={tip} labelStyle={{ fontWeight: 600 }} formatter={(v) => [`${v} completed`, '']} separator="" />
          <Area type="monotone" dataKey="completed" stroke="rgb(var(--primary))" strokeWidth={2} fill="url(#trendFill)" animationDuration={800} dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
