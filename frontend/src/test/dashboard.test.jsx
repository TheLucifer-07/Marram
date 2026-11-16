import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectHealth, { projectHealth } from '../components/dashboard/ProjectHealth'
import KpiCard from '../components/dashboard/KpiCard'
import TeamPanel from '../components/dashboard/TeamPanel'

const proj = (o) => ({ projectId: 1, name: 'Site', totalTasks: 10, completedTasks: 4, progress: 40, overdueTasks: 0, blockedTasks: 0, dueDate: '2099-01-01', createdBy: { id: 1, fullName: 'Priya Nair' }, ...o })
const now = new Date(2026, 10, 10)

describe('projectHealth', () => {
  it('has no verdict without tasks', () => expect(projectHealth(proj({ totalTasks: 0 }), now).key).toBe('empty'))
  it('is on track when nothing is late or blocked', () => expect(projectHealth(proj({}), now).key).toBe('on-track'))
  it('is at risk with overdue or blocked tasks', () => {
    expect(projectHealth(proj({ overdueTasks: 2 }), now).key).toBe('risk')
    expect(projectHealth(proj({ blockedTasks: 1 }), now).key).toBe('risk')
  })
  it('is past due when the date has passed and work remains', () => expect(projectHealth(proj({ dueDate: '2026-11-01' }), now).key).toBe('behind'))
  it('is not past due once complete', () => expect(projectHealth(proj({ dueDate: '2026-11-01', progress: 100, completedTasks: 10 }), now).key).not.toBe('behind'))
})

describe('dashboard components', () => {
  it('renders project rows that link to the project with an accessible progress bar', () => {
    render(<MemoryRouter><ProjectHealth projects={[proj({ overdueTasks: 3 })]} /></MemoryRouter>)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/projects/1')
    expect(screen.getByRole('progressbar', { name: 'Site completion' })).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('3 overdue')).toBeInTheDocument()
  })
  it('KpiCard links to a drill-down and only shows a delta when one is provided', () => {
    const { rerender } = render(<MemoryRouter><KpiCard label="Overdue" value={4} to="/app/tasks?overdue=1" sub="need attention" /></MemoryRouter>)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/tasks?overdue=1')
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
    rerender(<MemoryRouter><KpiCard label="Completed" value={9} delta={3} sub="last 7 days" /></MemoryRouter>)
    expect(screen.getByText('+3')).toBeInTheDocument()
  })
  it('TeamPanel lists members with workload and notes unassigned work', () => {
    render(<MemoryRouter><TeamPanel unassigned={2} workload={[{ userId: 1, fullName: 'Arjun Rao', role: 'LEAD', openTasks: 5, overdueTasks: 1, completedTasks: 2 }]} /></MemoryRouter>)
    expect(screen.getByText('Arjun Rao')).toBeInTheDocument()
    expect(screen.getByText(/2 open tasks are unassigned/)).toBeInTheDocument()
  })
})
