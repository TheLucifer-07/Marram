import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, THEME_KEY } from '../context/ThemeContext'
import ThemeToggle from '../components/ui/ThemeToggle'

describe('theme', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme') })

  it('defaults to light and applies the data-theme attribute', () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
  it('toggles and persists the choice', async () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    await userEvent.click(screen.getByRole('button', { name: /dark theme/i }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })
  it('restores the stored theme after a refresh', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: /light theme/i })).toHaveAttribute('aria-pressed', 'true')
  })
})
