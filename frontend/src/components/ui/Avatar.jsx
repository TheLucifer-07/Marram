import { initials } from '../../lib/format'

// Fixed dark tones: white initials stay at least 4.5:1 in both themes.
const tones = ['#2A5FC0', '#6B46C1', '#1F7A4A', '#8A5A00', '#19634F']

export default function Avatar({ user, size = 28, className = '' }) {
  const name = user?.fullName || user?.email || ''
  const tone = tones[(user?.id ?? name.length) % tones.length]
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size }} className={`rounded-full object-cover ${className}`} />
  }
  return (
    <span aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: tone }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}>
      {initials(name)}
    </span>
  )
}
