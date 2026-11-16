import { describe, expect, it } from 'vitest'
import { dueLabel, initials, validEmail, validatePassword, parseDate } from '../lib/format'
import { describeChange } from '../lib/activity'
import { errorMessage } from '../lib/api'

describe('format helpers', () => {
  it('validates passwords', () => {
    expect(validatePassword('short1')).toMatch(/8 characters/)
    expect(validatePassword('allletters')).toMatch(/letter and one number/)
    expect(validatePassword('long-enough-1')).toBeNull()
  })
  it('validates emails', () => {
    expect(validEmail('a@b.co')).toBe(true)
    expect(validEmail('nope')).toBe(false)
  })
  it('parses ISO dates as local dates without shifting a day', () => {
    const d = parseDate('2026-11-10')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 10])
  })
  it('labels due dates relative to today', () => {
    const now = new Date(2026, 10, 10, 15)
    expect(dueLabel('2026-11-08', now)).toBe('2 d overdue')
    expect(dueLabel('2026-11-10', now)).toBe('Due today')
    expect(dueLabel('2026-11-11', now)).toBe('Due tomorrow')
    expect(dueLabel(null, now)).toBeNull()
  })
  it('builds initials', () => {
    expect(initials('Alex Johnson Smith')).toBe('AJ')
    expect(initials('')).toBe('?')
  })
})

describe('activity descriptions', () => {
  it('describes status changes with readable labels', () => {
    expect(describeChange({ fieldName: 'status', oldValue: 'TODO', newValue: 'IN_PROGRESS' })).toBe('changed status from To do to In progress')
  })
  it('describes creation and unassignment', () => {
    expect(describeChange({ fieldName: 'created' })).toBe('created the task')
    expect(describeChange({ fieldName: 'assignee', oldValue: 'Priya', newValue: null })).toBe('changed assignee from Priya to Unassigned')
  })
})

describe('errorMessage', () => {
  it('prefers the server detail', () => {
    expect(errorMessage({ response: { status: 409, data: { detail: 'Transition not allowed' } } })).toBe('Transition not allowed')
  })
  it('joins validation errors', () => {
    expect(errorMessage({ response: { status: 400, data: { errors: [{ field: 'title', message: 'must not be blank' }] } } })).toBe('title: must not be blank')
  })
  it('explains network failures', () => {
    expect(errorMessage({ request: {} })).toMatch(/Cannot reach the server/)
  })
  it('explains 403 and 404 without detail', () => {
    expect(errorMessage({ response: { status: 403, data: {} } })).toMatch(/permission/)
    expect(errorMessage({ response: { status: 404, data: {} } })).toMatch(/no longer exists/)
  })
})
