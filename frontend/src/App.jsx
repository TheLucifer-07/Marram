import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { WorkspaceProvider } from './context/WorkspaceContext'
import ProtectedRoute from './components/app/ProtectedRoute'
import AppShell from './components/app/AppShell'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Tasks = lazy(() => import('./pages/Tasks'))
const TaskDetails = lazy(() => import('./pages/TaskDetails'))
const Members = lazy(() => import('./pages/Members'))
const Settings = lazy(() => import('./pages/Settings'))
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<WorkspaceProvider><OnboardingOrShell /></WorkspaceProvider>}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:taskId" element={<TaskDetails />} />
            <Route path="members" element={<Members />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

import { Outlet, useLocation } from 'react-router-dom'
import { useWorkspace } from './context/WorkspaceContext'
import { ErrorState, PageLoader } from './components/ui/States'

/** Waits for workspaces, then sends first-time users to onboarding and returning users past it. */
function OnboardingOrShell() {
  const { workspaces, loading, error, reload } = useWorkspace()
  const { pathname } = useLocation()
  if (loading) return <PageLoader label="Loading your workspaces" />
  if (error) return <div className="mx-auto max-w-md p-8"><ErrorState message={error} onRetry={reload} /></div>
  if (workspaces.length === 0 && pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
}
