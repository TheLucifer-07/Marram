import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

const MAX_COLD_START_RETRIES = 3
const RETRYABLE_STATUSES = new Set([408, 502, 503, 504])
const SAFE_METHODS = new Set(['get', 'head', 'options'])
const inFlight = new Map()
const wakeListeners = new Set()
let wakingRequests = 0

export function isBackendWaking() {
  return wakingRequests > 0
}

export function subscribeBackendWake(listener) {
  wakeListeners.add(listener)
  return () => wakeListeners.delete(listener)
}

function setWaking(config, waking) {
  if (waking && !config._marramWakeTracked) {
    config._marramWakeTracked = true
    wakingRequests += 1
  } else if (!waking && config._marramWakeTracked) {
    config._marramWakeTracked = false
    wakingRequests = Math.max(0, wakingRequests - 1)
  } else {
    return
  }
  wakeListeners.forEach((listener) => listener())
}

function isRetryable(error) {
  if (error.response) return RETRYABLE_STATUSES.has(error.response.status)
  return Boolean(error.request || ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(error.code))
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

api.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// One refresh attempt on 401, then sign out so the UI returns to the login page.
api.interceptors.response.use(
  (res) => {
    setWaking(res.config, false)
    return res
  },
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && supabase && original && !original._retried) {
      setWaking(original, false)
      original._retried = true
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && data?.session) {
        original.headers.Authorization = `Bearer ${data.session.access_token}`
        return api(original)
      }
      await supabase.auth.signOut()
    }

    const method = original?.method?.toLowerCase()
    if (original && SAFE_METHODS.has(method) && isRetryable(error)) {
      const retries = original._marramColdStartRetries || 0
      if (retries < MAX_COLD_START_RETRIES) {
        original._marramColdStartRetries = retries + 1
        setWaking(original, true)
        await wait(1000 * (2 ** retries))
        return api(original)
      }
      setWaking(original, false)
    }
    setWaking(original, false)
    return Promise.reject(error)
  },
)

async function requestOnce(method, url, data, config = {}) {
  let sessionScope = 'anonymous'
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession()
    sessionScope = sessionData?.session?.user?.id || 'authenticated'
  }

  const key = JSON.stringify([method, url, config.params || null, data ?? null, sessionScope])
  if (inFlight.has(key)) return inFlight.get(key)

  const request = api.request({ ...config, method, url, data })
  inFlight.set(key, request)
  try {
    return await request
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key)
  }
}

/** Turn any axios failure into a sentence a person can act on. */
export function errorMessage(error, fallback = 'Something went wrong. Try again.') {
  if (!error) return fallback
  if (error.config?._marramColdStartRetries && isRetryable(error)) {
    return 'The server is waking up or temporarily unavailable. Please try again shortly.'
  }
  if (error.response) {
    const d = error.response.data
    if (d?.errors?.length) return d.errors.map((e) => `${e.field}: ${e.message}`).join('. ')
    if (d?.detail) return d.detail
    if (error.response.status === 403) return 'You do not have permission to do that.'
    if (error.response.status === 404) return 'That item no longer exists or you cannot access it.'
    return fallback
  }
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.'
  if (error.request) return 'Cannot reach the server. Check your connection and try again.'
  return error.message || fallback
}

const unwrap = (p) => p.then((r) => r.data)
const qs = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const Api = {
  me: () => unwrap(requestOnce('get', '/auth/me')),
  updateMe: (body) => unwrap(requestOnce('patch', '/auth/me', body)),

  workspaces: () => unwrap(requestOnce('get', '/workspaces')),
  workspace: (id) => unwrap(requestOnce('get', `/workspaces/${id}`)),
  createWorkspace: (body) => unwrap(requestOnce('post', '/workspaces', body)),
  updateWorkspace: (id, body) => unwrap(requestOnce('put', `/workspaces/${id}`, body)),
  dashboard: (id) => unwrap(requestOnce('get', `/workspaces/${id}/dashboard`)),
  activity: (id, params) => unwrap(requestOnce('get', `/workspaces/${id}/activity`, undefined, { params: qs(params) })),

  members: (id) => unwrap(requestOnce('get', `/workspaces/${id}/members`)),
  addMember: (id, body) => unwrap(requestOnce('post', `/workspaces/${id}/members`, body)),
  updateMember: (id, userId, body) => unwrap(requestOnce('patch', `/workspaces/${id}/members/${userId}`, body)),
  removeMember: (id, userId) => unwrap(requestOnce('delete', `/workspaces/${id}/members/${userId}`)),

  projects: (wsId, params) => unwrap(requestOnce('get', `/workspaces/${wsId}/projects`, undefined, { params: qs(params) })),
  project: (id) => unwrap(requestOnce('get', `/projects/${id}`)),
  createProject: (wsId, body) => unwrap(requestOnce('post', `/workspaces/${wsId}/projects`, body)),
  updateProject: (id, body) => unwrap(requestOnce('put', `/projects/${id}`, body)),
  archiveProject: (id) => unwrap(requestOnce('patch', `/projects/${id}/archive`)),

  projectTasks: (id, params) => unwrap(requestOnce('get', `/projects/${id}/tasks`, undefined, { params: qs(params) })),
  workspaceTasks: (wsId, params) => unwrap(requestOnce('get', `/workspaces/${wsId}/tasks`, undefined, { params: qs(params) })),
  task: (id) => unwrap(requestOnce('get', `/tasks/${id}`)),
  createTask: (projectId, body) => unwrap(requestOnce('post', `/projects/${projectId}/tasks`, body)),
  updateTask: (id, body) => unwrap(requestOnce('put', `/tasks/${id}`, body)),
  setTaskStatus: (id, status) => unwrap(requestOnce('patch', `/tasks/${id}/status`, { status })),
  setTaskAssignee: (id, assigneeId) => unwrap(requestOnce('patch', `/tasks/${id}/assignee`, { assigneeId })),
  deleteTask: (id) => unwrap(requestOnce('delete', `/tasks/${id}`)),

  comments: (id, params) => unwrap(requestOnce('get', `/tasks/${id}/comments`, undefined, { params: qs(params) })),
  addComment: (id, content) => unwrap(requestOnce('post', `/tasks/${id}/comments`, { content })),
  history: (id, params) => unwrap(requestOnce('get', `/tasks/${id}/history`, undefined, { params: qs(params) })),
}
