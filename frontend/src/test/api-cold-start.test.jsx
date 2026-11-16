import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' }, access_token: 'preserved-access-token' } },
      }),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

import { Api, api, errorMessage, isBackendWaking } from '../lib/api'
import { PageLoader } from '../components/ui/States'

const originalAdapter = api.defaults.adapter

function response(config, data = { ok: true }, status = 200) {
  return Promise.resolve({ data, status, statusText: 'OK', headers: {}, config })
}

function failure(config, { code = 'ECONNABORTED', status } = {}) {
  if (status) {
    const result = { status, statusText: 'Service Unavailable', data: {}, config }
    return Promise.reject(new AxiosError('Service unavailable', 'ERR_BAD_RESPONSE', config, {}, result))
  }
  return Promise.reject(new AxiosError('Request timed out', code, config, {}))
}

async function flushMicrotasks() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve()
}

describe('API cold-start resilience', () => {
  beforeEach(() => vi.useFakeTimers())

  afterEach(() => {
    api.defaults.adapter = originalAdapter
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('shows the existing loading status while a timed-out safe request retries and recovers', async () => {
    const adapter = vi.fn()
      .mockImplementationOnce((config) => failure(config, { code: 'ECONNABORTED' }))
      .mockImplementationOnce((config) => response(config, { name: 'Marram' }))
    api.defaults.adapter = adapter

    const request = Api.dashboard(7)
    await flushMicrotasks()

    expect(adapter).toHaveBeenCalledTimes(1)
    expect(isBackendWaking()).toBe(true)
    render(<PageLoader label="Loading dashboard" />)
    expect(screen.getByRole('status')).toHaveTextContent('Waking the server')

    await vi.advanceTimersByTimeAsync(1000)
    await expect(request).resolves.toEqual({ name: 'Marram' })
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe('Bearer preserved-access-token')
    expect(isBackendWaking()).toBe(false)
  })

  it('uses bounded exponential backoff for temporary gateway responses', async () => {
    const adapter = vi.fn()
      .mockImplementationOnce((config) => failure(config, { status: 503 }))
      .mockImplementationOnce((config) => failure(config, { status: 502 }))
      .mockImplementationOnce((config) => failure(config, { status: 504 }))
      .mockImplementationOnce((config) => response(config, { recovered: true }))
    api.defaults.adapter = adapter

    const request = Api.workspaces()
    await flushMicrotasks()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    await expect(request).resolves.toEqual({ recovered: true })
    expect(adapter).toHaveBeenCalledTimes(4)
    expect(isBackendWaking()).toBe(false)
  })

  it('stops after three retries and returns a cold-start-specific message', async () => {
    const adapter = vi.fn((config) => failure(config, { status: 503 }))
    api.defaults.adapter = adapter

    const request = Api.me().then((value) => ({ value }), (error) => ({ error }))
    await flushMicrotasks()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)

    const { error } = await request
    expect(adapter).toHaveBeenCalledTimes(4)
    expect(errorMessage(error)).toMatch(/server is waking up or temporarily unavailable/i)
    expect(isBackendWaking()).toBe(false)
  })

  it('does not retry mutations and coalesces duplicate identical user actions in flight', async () => {
    let complete
    const adapter = vi.fn((config) => new Promise((resolve) => { complete = () => resolve({ data: { id: 9 }, status: 201, statusText: 'Created', headers: {}, config }) }))
    api.defaults.adapter = adapter

    const first = Api.addComment(9, 'Same comment')
    const duplicate = Api.addComment(9, 'Same comment')
    await flushMicrotasks()
    expect(adapter).toHaveBeenCalledTimes(1)
    complete()
    await expect(Promise.all([first, duplicate])).resolves.toEqual([{ id: 9 }, { id: 9 }])

    adapter.mockImplementation((config) => failure(config, { status: 503 }))
    const failedMutation = Api.createTask(3, { title: 'One attempt' }).then((value) => ({ value }), (error) => ({ error }))
    await flushMicrotasks()
    const { error } = await failedMutation
    expect(error).toBeInstanceOf(AxiosError)
    expect(adapter).toHaveBeenCalledTimes(2)

    const otherMutations = [
      () => Api.updateMe({ fullName: 'Alex' }),
      () => Api.updateWorkspace(1, { name: 'One update' }),
      () => Api.setTaskStatus(1, 'DONE'),
      () => Api.removeMember(1, 2),
    ]
    for (const action of otherMutations) {
      const before = adapter.mock.calls.length
      const result = action().then((value) => ({ value }), (requestError) => ({ error: requestError }))
      await flushMicrotasks()
      const failed = await result
      expect(failed.error).toBeInstanceOf(AxiosError)
      expect(adapter).toHaveBeenCalledTimes(before + 1)
    }
  })

  it('coalesces duplicate safe reads while they are in flight', async () => {
    let complete
    const adapter = vi.fn((config) => new Promise((resolve) => { complete = () => resolve({ data: [{ id: 1 }], status: 200, statusText: 'OK', headers: {}, config }) }))
    api.defaults.adapter = adapter

    const first = Api.workspaces()
    const duplicate = Api.workspaces()
    await flushMicrotasks()
    expect(adapter).toHaveBeenCalledTimes(1)
    complete()
    await expect(Promise.all([first, duplicate])).resolves.toEqual([[{ id: 1 }], [{ id: 1 }]])
  })
})
