import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-primary text-primary-ink hover:bg-primary/90 border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:bg-sunken',
  ghost: 'bg-transparent text-muted hover:bg-sunken hover:text-ink border border-transparent',
  danger: 'bg-danger text-white hover:bg-danger/90 border border-transparent',
}
const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
