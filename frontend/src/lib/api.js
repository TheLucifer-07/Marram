import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

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
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && supabase && original && !original._retried) {
      original._retried = true
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && data?.session) {
        original.headers.Authorization = `Bearer ${data.session.access_token}`
        return api(original)
      }
      await supabase.auth.signOut()
    }
    return Promise.reject(error)
  },
)

/** Turn any axios failure into a sentence a person can act on. */
export function errorMessage(error, fallback = 'Something went wrong. Try again.') {
  if (!error) return fallback
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
  me: () => unwrap(api.get('/auth/me')),
  updateMe: (body) => unwrap(api.patch('/auth/me', body)),

  workspaces: () => unwrap(api.get('/workspaces')),
  workspace: (id) => unwrap(api.get(`/workspaces/${id}`)),
  createWorkspace: (body) => unwrap(api.post('/workspaces', body)),
  updateWorkspace: (id, body) => unwrap(api.put(`/workspaces/${id}`, body)),
  dashboard: (id) => unwrap(api.get(`/workspaces/${id}/dashboard`)),
  activity: (id, params) => unwrap(api.get(`/workspaces/${id}/activity`, { params: qs(params) })),

  members: (id) => unwrap(api.get(`/workspaces/${id}/members`)),
  addMember: (id, body) => unwrap(api.post(`/workspaces/${id}/members`, body)),
  updateMember: (id, userId, body) => unwrap(api.patch(`/workspaces/${id}/members/${userId}`, body)),
  removeMember: (id, userId) => unwrap(api.delete(`/workspaces/${id}/members/${userId}`)),

  projects: (wsId, params) => unwrap(api.get(`/workspaces/${wsId}/projects`, { params: qs(params) })),
  project: (id) => unwrap(api.get(`/projects/${id}`)),
  createProject: (wsId, body) => unwrap(api.post(`/workspaces/${wsId}/projects`, body)),
  updateProject: (id, body) => unwrap(api.put(`/projects/${id}`, body)),
  archiveProject: (id) => unwrap(api.patch(`/projects/${id}/archive`)),

  projectTasks: (id, params) => unwrap(api.get(`/projects/${id}/tasks`, { params: qs(params) })),
  workspaceTasks: (wsId, params) => unwrap(api.get(`/workspaces/${wsId}/tasks`, { params: qs(params) })),
  task: (id) => unwrap(api.get(`/tasks/${id}`)),
  createTask: (projectId, body) => unwrap(api.post(`/projects/${projectId}/tasks`, body)),
  updateTask: (id, body) => unwrap(api.put(`/tasks/${id}`, body)),
  setTaskStatus: (id, status) => unwrap(api.patch(`/tasks/${id}/status`, { status })),
  setTaskAssignee: (id, assigneeId) => unwrap(api.patch(`/tasks/${id}/assignee`, { assigneeId })),
  deleteTask: (id) => unwrap(api.delete(`/tasks/${id}`)),

  comments: (id, params) => unwrap(api.get(`/tasks/${id}/comments`, { params: qs(params) })),
  addComment: (id, content) => unwrap(api.post(`/tasks/${id}/comments`, { content })),
  history: (id, params) => unwrap(api.get(`/tasks/${id}/history`, { params: qs(params) })),
}
