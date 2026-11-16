import { useSyncExternalStore } from 'react'
import { AlertTriangle } from 'lucide-react'
import { isBackendWaking, subscribeBackendWake } from '../../lib/api'
import Button from './Button'

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-sunken ${className}`} />
}

export function PageLoader({ label = 'Loading' }) {
  const waking = useSyncExternalStore(subscribeBackendWake, isBackendWaking, () => false)
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">{waking ? 'Waking the server' : label}</span>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center">
      {Icon && <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon size={20} /></span>}
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface px-6 py-10 text-center">
      <AlertTriangle size={22} className="mb-2 text-danger" />
      <p className="max-w-md text-sm">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}
