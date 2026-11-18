/** Build callback URLs from the origin serving this app (local, preview, or production). */
export function getAuthRedirectUrl(origin = window.location.origin) {
  return new URL('/auth/callback', origin).toString()
}
