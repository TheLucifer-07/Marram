import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/ui/States'

function callbackError() {
  const p = new URLSearchParams(window.location.search)
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return p.get('error_description') || h.get('error_description') || p.get('error') || h.get('error')
}

/** Landing point for Google OAuth and email-confirmation redirects. supabase-js completes the exchange. */
export default function AuthCallback() {
  const { isAuthenticated, loading } = useAuth()
  const [error] = useState(callbackError)
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 12000); return () => clearTimeout(t) }, [])

  if (isAuthenticated) return <Navigate to="/app" replace />
  if (error || (timedOut && !loading)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-semibold">We could not finish signing you in</h1>
        <p role="alert" className="mt-2 text-sm text-muted">{error ? decodeURIComponent(error.replace(/\+/g, ' ')) : 'The sign-in link expired or was already used.'}</p>
        <Link to="/login" className="mt-5 font-medium text-primary hover:underline">Back to sign in</Link>
      </div>
    )
  }
  return <PageLoader label="Finishing sign-in" />
}
