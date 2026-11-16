import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label && <div className="mb-1.5 text-sm font-medium text-ink">{label}</div>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

export function TextInput({ label, error, hint, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>}
      <input id={id} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-e` : undefined} {...props} />
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-e`} role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

export function TextArea({ label, error, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>}
      <textarea id={id} rows={4} className="input resize-y" aria-invalid={Boolean(error)} {...props} />
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

export function Select({ label, error, className = '', children, ...props }) {
  const id = useId()
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>}
      <select id={id} className="input pr-8" aria-invalid={Boolean(error)} {...props}>{children}</select>
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

export function PasswordInput({ label, error, hint, className = '', ...props }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>}
      <div className="relative">
        <input id={id} type={shown ? 'text' : 'password'} className="input pr-10" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-e` : undefined} {...props} />
        <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink">{shown ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-e`} role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}
