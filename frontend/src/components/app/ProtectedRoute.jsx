import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ErrorState, PageLoader } from '../ui/States'
import Button from '../ui/Button'

export function ConfigMissing() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Supabase is not configured</h1>
      <p className="mt-2 text-muted">
        Set <code className="rounded bg-sunken px-1">VITE_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-sunken px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code className="rounded bg-sunken px-1">frontend/.env</code>, then restart the dev server.
        The setup steps are in the root README.
      </p>
    </div>
  )
}

export default function ProtectedRoute() {
  const { configured, loading, isAuthenticated, profile, profileError, reloadProfile, signOut } = useAuth()
  const location = useLocation()

  if (!configured) return <ConfigMissing />
  if (loading) return <PageLoader label="Restoring your session" />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (profileError) {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorState message={profileError} onRetry={reloadProfile} />
        <div className="mt-3 text-center"><Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button></div>
      </div>
    )
  }
  if (!profile) return <PageLoader label="Loading your profile" />
  return <Outlet />
}
