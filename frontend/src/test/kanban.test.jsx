import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import KanbanBoard from '../components/app/KanbanBoard'
import TaskList from '../components/app/TaskList'

const task = (o) => ({ id: 1, title: 'Write docs', status: 'TODO', priority: 'HIGH', assignee: null, dueDate: null, overdue: false, projectName: 'P', canChangeStatus: true, allowedTransitions: ['IN_PROGRESS'], ...o })
const setViewport = (wide) => { window.matchMedia = (q) => ({ matches: wide, media: q, addEventListener: () => {}, removeEventListener: () => {} }) }
const board = (tasks, onMove = async () => true) => render(<MemoryRouter><KanbanBoard tasks={tasks} onMove={onMove} /></MemoryRouter>)

describe('KanbanBoard (desktop)', () => {
  beforeEach(() => setViewport(true))

  it('groups tasks by status', () => {
    board([task({}), task({ id: 2, title: 'Ship', status: 'DONE', allowedTransitions: [] })])
    expect(screen.getByRole('region', { name: 'To do' })).toHaveTextContent('Write docs')
    expect(screen.getByRole('region', { name: 'Done' })).toHaveTextContent('Ship')
  })

  it('moves a dropped card immediately and asks the server to confirm', async () => {
    const onMove = vi.fn().mockResolvedValue(true)
    board([task({})], onMove)
    fireEvent.dragStart(screen.getByText('Write docs').closest('li'))
    fireEvent.drop(screen.getByRole('region', { name: 'In progress' }))
    expect(screen.getByRole('region', { name: 'In progress' })).toHaveTextContent('Write docs')
    await waitFor(() => expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 1, status: 'TODO' }), 'IN_PROGRESS'))
  })

  it('rolls the card back when the server refuses the move', async () => {
    const onMove = vi.fn().mockResolvedValue(false)
    board([task({})], onMove)
    fireEvent.dragStart(screen.getByText('Write docs').closest('li'))
    fireEvent.drop(screen.getByRole('region', { name: 'In progress' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'To do' })).toHaveTextContent('Write docs'))
    expect(screen.getByRole('region', { name: 'In progress' })).not.toHaveTextContent('Write docs')
  })

  it('does not apply an illegal move optimistically', async () => {
    const onMove = vi.fn().mockResolvedValue(false)
    board([task({})], onMove)
    fireEvent.dragStart(screen.getByText('Write docs').closest('li'))
    fireEvent.drop(screen.getByRole('region', { name: 'Done' }))
    expect(screen.getByRole('region', { name: 'To do' })).toHaveTextContent('Write docs')
  })

  it('offers a keyboard-accessible move menu limited to allowed transitions', async () => {
    const onMove = vi.fn().mockResolvedValue(true)
    board([task({})], onMove)
    await userEvent.click(screen.getByRole('button', { name: 'Move Write docs' }))
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
    await userEvent.click(screen.getByRole('menuitem', { name: /Move to In progress/ }))
    await waitFor(() => expect(onMove).toHaveBeenCalled())
  })

  it('does not make cards draggable or movable when the user cannot change status', () => {
    board([task({ canChangeStatus: false })])
    expect(screen.getByText('Write docs').closest('li')).toHaveAttribute('draggable', 'false')
    expect(screen.queryByRole('button', { name: 'Move Write docs' })).not.toBeInTheDocument()
  })
})

describe('KanbanBoard (mobile)', () => {
  it('shows one column at a time behind tabs', async () => {
    setViewport(false)
    board([task({}), task({ id: 2, title: 'Ship', status: 'DONE', allowedTransitions: [] })])
    expect(screen.getByRole('tablist', { name: 'Board columns' })).toBeInTheDocument()
    expect(screen.getByText('Write docs')).toBeInTheDocument()
    expect(screen.queryByText('Ship')).not.toBeInTheDocument()
    await act(async () => { await userEvent.click(screen.getByRole('tab', { name: /Done/ })) })
    expect(screen.getByText('Ship')).toBeInTheDocument()
  })
})

describe('TaskList', () => {
  it('flags overdue tasks', () => {
    render(<MemoryRouter><TaskList tasks={[task({ dueDate: '2020-01-01', overdue: true })]} /></MemoryRouter>)
    expect(screen.getByText(/overdue/)).toHaveClass('text-danger')
  })
})
