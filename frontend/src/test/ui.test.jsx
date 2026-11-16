import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import Modal from '../components/ui/Modal'
import Tabs from '../components/ui/Tabs'
import Menu from '../components/ui/Menu'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import { DueText } from '../components/app/TaskList'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit thing" footer={<button>Save</button>}>
        <label>Name<input /></label>
      </Modal>
    </>
  )
}

describe('Modal focus management', () => {
  it('moves focus to the first field, traps Tab, closes on Escape and restores focus', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    await userEvent.click(opener)
    const input = await screen.findByLabelText('Name')
    await vi.waitFor(() => expect(input).toHaveFocus())
    for (let i = 0; i < 6; i++) { await userEvent.tab(); expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true) }
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await vi.waitFor(() => expect(opener).toHaveFocus())
  })
})

describe('Tabs', () => {
  it('uses roving tabindex and arrow keys', async () => {
    const onChange = vi.fn()
    render(<Tabs value="a" onChange={onChange} tabs={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('tabindex', '-1')
    screen.getByRole('tab', { name: 'A' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Menu', () => {
  it('opens from the keyboard, moves with arrows, activates with Enter and closes on Escape', async () => {
    const pick = vi.fn()
    render(<Menu label="Actions" trigger="⋯" items={[{ label: 'One', onSelect: pick }, { label: 'Two', onSelect: pick }]} />)
    screen.getByRole('button', { name: 'Actions' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Two' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(pick).toHaveBeenCalledTimes(1)
  })
  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Menu label="Actions" trigger="⋯" items={[{ label: 'One', onSelect: () => {} }]} />)
    const btn = screen.getByRole('button', { name: 'Actions' })
    await userEvent.click(btn)
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(btn).toHaveFocus()
  })
})

describe('AnimatedNumber', () => {
  it('always exposes the real value to assistive technology', () => {
    render(<AnimatedNumber value={42} />)
    expect(screen.getByLabelText('42')).toBeInTheDocument()
  })
})

describe('DueText', () => {
  const base = { dueDate: '2020-01-01', overdue: true, status: 'TODO' }
  it('labels unfinished late tasks as overdue', () => {
    render(<MemoryRouter><DueText task={base} /></MemoryRouter>)
    expect(screen.getByText(/overdue/)).toBeInTheDocument()
  })
  it('never calls a finished task overdue', () => {
    render(<MemoryRouter><DueText task={{ ...base, status: 'DONE', overdue: false }} /></MemoryRouter>)
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument()
    expect(screen.getByText(/Jan/)).toBeInTheDocument()
  })
})
