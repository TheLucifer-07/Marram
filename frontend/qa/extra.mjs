// Extra scenes: MEMBER-role UI (hidden controls) and the OAuth callback error state.  Usage: node qa/extra.mjs
import fs from 'node:fs'
import { build, serve, launch, context, ORIGIN } from './harness.mjs'

const out = 'qa/shots/extra'; fs.mkdirSync(out, { recursive: true })
const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }
build(); const server = await serve()

for (const viewport of ['desktop', 'mobile']) {
  // --- MEMBER role
  let browser = await launch(); let { ctx } = await context(browser, { viewport, theme: 'light', role: 'MEMBER' }); let page = await ctx.newPage()
  const errors = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(ORIGIN + '/app', { waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
  check(`[${viewport}] member: dashboard has no "New project" / "New task"`, (await page.getByRole('button', { name: /New project|New task/ }).count()) === 0)
  await page.screenshot({ path: `${out}/dashboard-member__${viewport}.png`, fullPage: true })
  await page.goto(ORIGIN + '/app/projects/1', { waitUntil: 'networkidle' }); await page.waitForTimeout(600)
  check(`[${viewport}] member: project page has no Edit / Archive / New task`, (await page.getByRole('button', { name: /^(Edit|Archive|New task)$/ }).count()) === 0)
  await page.getByRole('button', { name: 'Board' }).click(); await page.waitForTimeout(500)
  if (viewport === 'desktop') {
    // Fixture: only task 11 and others assigned to user 1 are movable; task 2 belongs to Meera.
    check('member: card of someone else\'s task has no move menu', (await page.getByRole('button', { name: 'Move Design pricing page' }).count()) === 0)
    check('member: card of their own task has a move menu', (await page.getByRole('button', { name: 'Move Write launch announcement' }).count()) === 1)
  }
  await page.screenshot({ path: `${out}/project-board-member__${viewport}.png`, fullPage: true })
  await page.goto(ORIGIN + '/app/tasks/2', { waitUntil: 'networkidle' }); await page.waitForTimeout(500)
  check(`[${viewport}] member: someone else's task shows no Edit/Delete, no status moves, read-only assignee`, (await page.getByRole('button', { name: /^Edit$|Delete task/ }).count()) === 0 && (await page.getByRole('button', { name: /^Move to/ }).count()) === 0 && (await page.getByRole('combobox', { name: 'Assignee' }).count()) === 0)
  await page.screenshot({ path: `${out}/task-details-member__${viewport}.png`, fullPage: true })
  await page.goto(ORIGIN + '/app/members', { waitUntil: 'networkidle' }); await page.waitForTimeout(500)
  check(`[${viewport}] member: members page has no Add member, role selects or remove buttons`, (await page.getByRole('button', { name: 'Add member' }).count()) === 0 && (await page.getByRole('combobox', { name: /Role for/ }).count()) === 0 && (await page.getByRole('button', { name: /^Remove / }).count()) === 0)
  await page.screenshot({ path: `${out}/members-member__${viewport}.png`, fullPage: true })
  await page.goto(ORIGIN + '/app/settings', { waitUntil: 'networkidle' }); await page.waitForTimeout(400)
  check(`[${viewport}] member: workspace settings are read-only`, (await page.getByRole('button', { name: 'Save workspace' }).count()) === 0 && (await page.getByLabel('Name').nth(0).isDisabled().catch(() => true)) !== undefined)
  check(`[${viewport}] member: no page errors`, errors.length === 0, errors[0] ?? '')
  await browser.close().catch(() => {})

  // --- OAuth callback failure
  browser = await launch(); ({ ctx } = await context(browser, { viewport, theme: 'dark', auth: false })); page = await ctx.newPage()
  await page.goto(ORIGIN + '/auth/callback?error=access_denied&error_description=Access+denied+by+user', { waitUntil: 'networkidle' }); await page.waitForTimeout(500)
  check(`[${viewport}] OAuth callback failure shows the provider message and a way back`, (await page.getByRole('alert').innerText()).includes('Access denied by user') && (await page.getByRole('link', { name: 'Back to sign in' }).count()) === 1)
  await page.screenshot({ path: `${out}/auth-callback-error__${viewport}__dark.png` })
  await browser.close().catch(() => {})
}
server.kill()
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
if (results.includes(false)) process.exitCode = 1
