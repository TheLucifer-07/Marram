import { describe, expect, it } from 'vitest'
import { getAuthRedirectUrl } from '../lib/authRedirect'

describe('getAuthRedirectUrl', () => {
  it('keeps local development on the current local origin', () => {
    expect(getAuthRedirectUrl('http://localhost:5173')).toBe('http://localhost:5173/auth/callback')
  })

  it('uses the exact preview deployment origin', () => {
    expect(getAuthRedirectUrl('https://marram-git-feature-team.vercel.app')).toBe(
      'https://marram-git-feature-team.vercel.app/auth/callback',
    )
  })

  it('uses the exact production origin without carrying route or query data', () => {
    expect(getAuthRedirectUrl('https://marram.example')).toBe('https://marram.example/auth/callback')
  })
})
