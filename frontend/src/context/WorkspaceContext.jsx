import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Api, errorMessage } from '../lib/api'
import { useAuth } from './AuthContext'

const WorkspaceContext = createContext(null)
const KEY = 'marram.workspace'

export function WorkspaceProvider({ children }) {
  const { profile } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [currentId, setCurrentId] = useState(() => {
    try { return Number(localStorage.getItem(KEY)) || null } catch { return null }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const list = await Api.workspaces()
      setWorkspaces(list)
      setCurrentId((prev) => (list.some((w) => w.id === prev) ? prev : list[0]?.id ?? null))
    } catch (e) {
      setError(errorMessage(e, 'Could not load your workspaces.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (profile) reload() }, [profile, reload])

  const select = useCallback((id) => {
    setCurrentId(id)
    try { localStorage.setItem(KEY, String(id)) } catch { /* ignore */ }
  }, [])

  const current = useMemo(() => workspaces.find((w) => w.id === currentId) ?? null, [workspaces, currentId])
  const role = current?.myRole ?? null
  const value = useMemo(() => ({
    workspaces, current, role, loading, error, reload, select,
    canManageWork: role === 'OWNER' || role === 'LEAD',
    isOwner: role === 'OWNER',
  }), [workspaces, current, role, loading, error, reload, select])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
