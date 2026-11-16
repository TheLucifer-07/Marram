import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import GoogleButton from './GoogleButton'
import Button from '../components/ui/Button'
import { PasswordInput, TextInput } from '../components/ui/Field'
import { useAuth } from '../context/AuthContext'
import { validEmail } from '../lib/format'
import { ConfigMissing } from '../components/app/ProtectedRoute'

export function friendlyAuthError(err) {
  const msg = err?.message || ''
  if (/invalid login credentials/i.test(msg)) return 'That email and password do not match an account.'
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link we sent.'
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Wait a minute and try again.'
  if (/fetch|network/i.test(msg)) return 'Cannot reach the sign-in service. Check your connection and try again.'
  return msg || 'Sign-in failed. Try again.'
}

export default function Login() {
  const { configured, signIn, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!configured) return <ConfigMissing />
  if (!loading && isAuthenticated) return <Navigate to={location.state?.from || '/app'} replace />

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!validEmail(form.email)) next.email = 'Enter a valid email address.'
    if (!form.password) next.password = 'Enter your password.'
    setErrors(next); setFormError(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await signIn({ email: form.email.trim(), password: form.password })
      navigate(location.state?.from || '/app', { replace: true })
    } catch (err) { setFormError(friendlyAuthError(err)) } finally { setBusy(false) }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Pick up where your team left off."
      footer={<>New to Marram? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link></>}>
      <GoogleButton onError={setFormError} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" /></div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordInput label="Password" autoComplete="current-password" value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {formError && <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
      </form>
    </AuthLayout>
  )
}
