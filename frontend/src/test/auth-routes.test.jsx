import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const auth = { configured: true, loading: false, isAuthenticated: false, profile: null, profileError: null, signIn: vi.fn(), signUp: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn(), reloadProfile: vi.fn() }
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }))

import ProtectedRoute from '../components/app/ProtectedRoute'
import Login from '../pages/Login'
import Register from '../pages/Register'
import { ThemeProvider } from '../context/ThemeContext'

const wrap = (ui, path = '/') => render(<MemoryRouter initialEntries={[path]}><ThemeProvider>{ui}</ThemeProvider></MemoryRouter>)

describe('ProtectedRoute', () => {
  const tree = (
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route element={<ProtectedRoute />}><Route path="/app" element={<p>secret</p>} /></Route>
    </Routes>
  )
  it('redirects anonymous visitors to login', () => {
    Object.assign(auth, { isAuthenticated: false, profile: null, loading: false })
    wrap(tree, '/app')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })
  it('shows a loader while the session is restored', () => {
    Object.assign(auth, { isAuthenticated: false, loading: true })
    wrap(tree, '/app')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
  it('renders the page once authenticated with a profile', () => {
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: { id: 1, fullName: 'A B' } })
    wrap(tree, '/app')
    expect(screen.getByText('secret')).toBeInTheDocument()
  })
  it('offers a retry when the profile cannot be loaded', async () => {
    Object.assign(auth, { isAuthenticated: true, loading: false, profile: null, profileError: 'Cannot reach the server.' })
    wrap(tree, '/app')
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(auth.reloadProfile).toHaveBeenCalled()
    auth.profileError = null
  })
})

describe('Login form', () => {
  it('validates before calling Supabase', async () => {
    Object.assign(auth, { isAuthenticated: false, loading: false })
    wrap(<Login />, '/login')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(auth.signIn).not.toHaveBeenCalled()
  })
  it('shows a friendly message for bad credentials', async () => {
    auth.signIn.mockRejectedValueOnce(new Error('Invalid login credentials'))
    wrap(<Login />, '/login')
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match an account/)
  })
})

describe('Register form', () => {
  it('enforces the password policy client-side', async () => {
    wrap(<Register />, '/register')
    await userEvent.type(screen.getByLabelText('Full name'), 'Alex Johnson')
    await userEvent.type(screen.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })
  it('tells the person to check their inbox when confirmation is required', async () => {
    auth.signUp.mockResolvedValueOnce({ needsConfirmation: true })
    wrap(<Register />, '/register')
    await userEvent.type(screen.getByLabelText('Full name'), 'Alex Johnson')
    await userEvent.type(screen.getByLabelText('Email'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'StrongPass123')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
  })
})
