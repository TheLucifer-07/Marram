const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** Parse an ISO date (yyyy-mm-dd) as a local date so it never shifts a day. */
export function parseDate(value) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}
export const formatDate = (v) => (v ? dateFmt.format(parseDate(v)) : 'No date')
export const formatShortDate = (v) => (v ? shortFmt.format(parseDate(v)) : 'No date')
export const formatDateTime = (v) => (v ? timeFmt.format(new Date(v)) : '')

export function relativeTime(value, now = new Date()) {
  if (!value) return ''
  const diff = (now.getTime() - new Date(value).getTime()) / 1000
  if (diff < 45) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} d ago`
  return formatDate(value.slice(0, 10))
}

export function dueLabel(dueDate, now = new Date()) {
  if (!dueDate) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((parseDate(dueDate) - today) / 86400000)
  if (days < 0) return `${-days} d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 8) return `Due in ${days} d`
  return `Due ${formatShortDate(dueDate)}`
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'

export function validatePassword(pw) {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.'
  return null
}
export const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
