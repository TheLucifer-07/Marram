import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/app/PageHeader'
import Button from '../components/ui/Button'
import { TextArea, TextInput } from '../components/ui/Field'
import { RoleBadge } from '../components/ui/Badges'
import { useToast } from '../components/ui/Toast'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { Api, errorMessage } from '../lib/api'
import { ROLES, ROLE_META } from '../lib/constants'
import { formatDate } from '../lib/format'

function Section({ title, description, children }) {
  return (
    <section className="card grid gap-6 p-5 md:grid-cols-[220px_1fr]">
      <div><h2 className="text-base font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
      <div className="max-w-md">{children}</div>
    </section>
  )
}

export default function Settings() {
  const { profile, setProfile, signOut } = useAuth()
  const { current, isOwner, reload } = useWorkspace()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(profile.fullName)
  const [nameError, setNameError] = useState(null)
  const [ws, setWs] = useState({ name: current.name, description: current.description ?? '' })
  const [wsError, setWsError] = useState(null)
  const [busy, setBusy] = useState(null)

  async function saveProfile(e) {
    e.preventDefault()
    if (name.trim().length < 2) return setNameError('Enter your full name.')
    setBusy('profile'); setNameError(null)
    try { setProfile(await Api.updateMe({ fullName: name.trim() })); toast.success('Profile saved') } catch (err) { setNameError(errorMessage(err)) } finally { setBusy(null) }
  }
  async function saveWorkspace(e) {
    e.preventDefault()
    if (!ws.name.trim()) return setWsError('Give the workspace a name.')
    setBusy('ws'); setWsError(null)
    try { await Api.updateWorkspace(current.id, { name: ws.name.trim(), description: ws.description.trim() || null }); await reload(); toast.success('Workspace saved') } catch (err) { setWsError(errorMessage(err)) } finally { setBusy(null) }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-3xl space-y-4">
        <Section title="Profile" description="How your name appears to teammates.">
          <form onSubmit={saveProfile} className="space-y-4" noValidate>
            <TextInput label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={nameError} maxLength={100} />
            <TextInput label="Email" value={profile.email} disabled hint="Your email comes from your sign-in and cannot be changed here." readOnly />
            <Button type="submit" loading={busy === 'profile'} disabled={name.trim() === profile.fullName}>Save profile</Button>
          </form>
        </Section>

        <Section title="Workspace" description={isOwner ? 'Only the owner can change these.' : 'Only the owner can change these details.'}>
          <form onSubmit={saveWorkspace} className="space-y-4" noValidate>
            <TextInput label="Name" value={ws.name} onChange={(e) => setWs({ ...ws, name: e.target.value })} disabled={!isOwner} maxLength={120} error={wsError} />
            <TextArea label="Description" rows={3} value={ws.description} onChange={(e) => setWs({ ...ws, description: e.target.value })} disabled={!isOwner} />
            {isOwner && <Button type="submit" loading={busy === 'ws'}>Save workspace</Button>}
          </form>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div><dt className="eyebrow">Members</dt><dd className="mt-0.5 tabular-nums">{current.memberCount}</dd></div>
            <div><dt className="eyebrow">Created</dt><dd className="mt-0.5">{formatDate(current.createdAt.slice(0, 10))}</dd></div>
          </dl>
        </Section>

        <Section title="Roles" description="What each role can do in this workspace.">
          <ul className="space-y-3">{ROLES.map((r) => (
            <li key={r} className="flex items-start gap-3 text-sm"><RoleBadge role={r} /><span className="text-muted">{ROLE_META[r].blurb}</span></li>
          ))}</ul>
          <p className="mt-3 text-sm">Your role here: <RoleBadge role={current.myRole} /></p>
        </Section>

        <Section title="Appearance" description="Saved on this device.">
          <div className="inline-flex rounded border border-line bg-surface p-0.5" role="group" aria-label="Theme">
            {['light', 'dark'].map((t) => (
              <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}
                className={`rounded-sm px-4 py-1.5 text-sm capitalize ${theme === t ? 'bg-primary-soft font-medium text-primary' : 'text-muted hover:text-ink'}`}>{t}</button>
            ))}
          </div>
        </Section>

        <Section title="Session">
          <Button variant="secondary" onClick={async () => { await signOut(); navigate('/') }}>Sign out</Button>
        </Section>
      </div>
    </>
  )
}
