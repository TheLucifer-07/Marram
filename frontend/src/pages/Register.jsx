import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthLayout from './AuthLayout'
import GoogleButton from './GoogleButton'
import Button from '../components/ui/Button'
import { PasswordInput, TextInput } from '../components/ui/Field'
import { useAuth } from '../context/AuthContext'
import { validEmail, validatePassword } from '../lib/format'
import { friendlyAuthError } from './Login'
import { ConfigMissing } from '../components/app/ProtectedRoute'

export default function Register() {
  const { configured, signUp, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState(null)

  if (!configured) return <ConfigMissing />
  if (!loading && isAuthenticated) return <Navigate to="/app" replace />

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name.'
    if (!validEmail(form.email)) next.email = 'Enter a valid email address.'
    const pw = validatePassword(form.password)
    if (pw) next.password = pw
    setErrors(next); setFormError(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const { needsConfirmation } = await signUp({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password })
      if (needsConfirmation) setSentTo(form.email.trim()); else navigate('/app', { replace: true })
    } catch (err) { setFormError(err.code === 'duplicate' ? err.message : friendlyAuthError(err)) } finally { setBusy(false) }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox" subtitle={`We sent a confirmation link to ${sentTo}.`} footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
        <div className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm text-muted">
          <MailCheck className="mt-0.5 shrink-0 text-primary" size={20} />
          Open the link to activate your account, then sign in. It can take a minute to arrive.
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Free to start. Your workspace is one step away."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}>
      <GoogleButton onError={setFormError} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" /></div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Full name" autoComplete="name" value={form.fullName} error={errors.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <TextInput label="Email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordInput label="Password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {formError && <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
      </form>
    </AuthLayout>
  )
}
