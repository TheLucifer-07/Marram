// Keyboard, focus, theme, reduced-motion and performance checks. Usage: node qa/interactions.mjs
import { build, serve, launch, context, ORIGIN } from './harness.mjs'

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }
const focusInfo = (page) => page.evaluate(() => { const a = document.activeElement; const cs = a && getComputedStyle(a); return { tag: a?.tagName, name: (a?.getAttribute('aria-label') || a?.textContent || '').trim().slice(0, 40), inDialog: Boolean(a?.closest('[role="dialog"]')), outline: cs ? `${cs.outlineStyle} ${cs.outlineWidth}` : '', shadow: cs?.boxShadow !== 'none' } })

build()
const server = await serve()
// Single-process Chromium: one browser per scenario group.
async function session(opts, fn) { const browser = await launch(); const { ctx, store } = await context(browser, opts); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text())); try { await fn(page, store, errors) } catch (e) { check(`scenario crashed: ${e.message.slice(0, 120)}`, false) } await browser.close().catch(() => {}) }

await session({ viewport: 'desktop' }, async (page) => {
  await page.goto(ORIGIN + '/app', { waitUntil: 'networkidle' })
  // 1. Skip link is the first tab stop and works
  await page.keyboard.press('Tab')
  let f = await focusInfo(page)
  check('first Tab stop is a "Skip to content" link', /skip to content/i.test(f.name), f.name)
  await page.keyboard.press('Enter')
  check('skip link moves focus into <main>', await page.evaluate(() => document.activeElement?.id === 'main' || Boolean(document.activeElement?.closest('main'))))
  // 2. Every focusable element shows a visible focus indicator (sample the first 25 tab stops)
  await page.evaluate(() => document.activeElement?.blur()); let bad = []
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); const x = await focusInfo(page); if (!(x.outline.startsWith('solid') && !x.outline.endsWith(' 0px')) && !x.shadow) bad.push(x.name || x.tag) }
  check('first 25 tab stops all show a focus indicator', bad.length === 0, bad.slice(0, 4).join(' | '))
  // 3. Modal: focus moves in, is trapped, Escape closes and restores focus
  const trigger = page.getByRole('button', { name: 'New task' }).first()
  await trigger.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  f = await focusInfo(page); check('opening a modal moves focus inside it', f.inDialog, f.name)
  let escaped = false
  for (let i = 0; i < 18; i++) { await page.keyboard.press('Tab'); if (!(await focusInfo(page)).inDialog) escaped = true }
  check('Tab does not leave an open modal (focus trap)', !escaped)
  for (let i = 0; i < 18; i++) { await page.keyboard.press('Shift+Tab'); if (!(await focusInfo(page)).inDialog) escaped = true }
  check('Shift+Tab does not leave an open modal', !escaped)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  check('Escape closes the modal', (await page.getByRole('dialog').count()) === 0)
  check('focus returns to the control that opened the modal', (await focusInfo(page)).name.includes('New task'))
  // 4. Tabs: arrow keys
  const tab = page.getByRole('tab', { name: 'Due soon' }); await tab.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300)
  check('ArrowRight moves to the next tab and selects it', (await page.getByRole('tab', { name: /Overdue/ }).getAttribute('aria-selected')) === 'true')
  // 5. Theme: toggle, persist, no wrong-theme flash
  await page.getByRole('button', { name: /dark theme/i }).click(); await page.waitForTimeout(400)
  check('theme toggle switches data-theme', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
  await page.reload({ waitUntil: 'domcontentloaded' })
  check('theme persists after reload', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
})

await session({ viewport: 'desktop', theme: 'dark' }, async (page) => {
  await page.addInitScript(() => { document.addEventListener('readystatechange', () => { if (!window.__firstTheme) window.__firstTheme = document.documentElement.dataset.theme }) })
  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' })
  check('stored dark theme is applied before first paint (no flash)', (await page.evaluate(() => window.__firstTheme)) === 'dark')
})

await session({ viewport: 'desktop' }, async (page) => {
  // 6. Kanban keyboard path
  await page.goto(ORIGIN + '/app/projects/1', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Board' }).click(); await page.waitForTimeout(500)
  const patches = []; page.on('request', (r) => r.method() === 'PATCH' && patches.push(r.url()))
  const menuBtn = page.getByRole('button', { name: 'Move Write launch announcement' })
  await menuBtn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(250)
  check('card move menu opens from the keyboard and focuses its first item', (await page.evaluate(() => document.activeElement?.getAttribute('role'))) === 'menuitem')
  await page.keyboard.press('Enter'); await page.waitForTimeout(700)
  check('choosing a menu item persists the move through the API', patches.some((u) => /\/tasks\/1\/status$/.test(u)))
  check('the card appears in the new column', /Write launch announcement/.test(await page.getByRole('region', { name: 'In progress' }).innerText()))
  check('focus returns to the menu trigger after choosing', /Move Write launch announcement/.test((await focusInfo(page)).name))
})

await session({ viewport: 'desktop' }, async (page) => {
  // 7. Drawer: focus + Escape (members)
  await page.goto(ORIGIN + '/app/members', { waitUntil: 'networkidle' })
  const opener = page.getByRole('button', { name: /View work for Arjun/ }); await opener.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(450)
  check('drawer moves focus inside', (await focusInfo(page)).inDialog)
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  check('Escape closes the drawer and returns focus', (await page.getByRole('dialog').count()) === 0 && /View work for Arjun/.test((await focusInfo(page)).name))
})

await session({ viewport: 'mobile' }, async (page) => {
  // 8. Mobile navigation
  await page.goto(ORIGIN + '/app', { waitUntil: 'networkidle' })
  const opener = page.getByRole('button', { name: 'Open menu' }); await opener.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(450)
  check('mobile nav opens as a dialog with focus inside', (await focusInfo(page)).inDialog)
  let escaped = false; for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); if (!(await focusInfo(page)).inDialog) escaped = true }
  check('mobile nav traps focus', !escaped)
  await page.keyboard.press('Escape'); await page.waitForTimeout(900)
  const after = await focusInfo(page)
  check('Escape closes the mobile nav and returns focus to the menu button', (await page.getByRole('dialog').count()) === 0 && /Open menu/.test(after.name), `dialogs=${await page.getByRole('dialog').count()} focus="${after.name}"`)
  await opener.click(); await page.waitForTimeout(400); await page.getByRole('dialog').getByRole('link', { name: 'Projects', exact: true }).click(); await page.waitForTimeout(500)
  check('choosing a nav item navigates and closes the nav', page.url().endsWith('/app/projects') && (await page.getByRole('dialog').count()) === 0)
  const targets = await page.evaluate(() => [...document.querySelectorAll('a,button,select,input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && (r.width < 24 || r.height < 24) }).map((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24)))
  check('no interactive target is smaller than 24x24 px on mobile (WCAG 2.5.8)', targets.length === 0, [...new Set(targets)].slice(0, 5).join(' | '))
})

await session({ viewport: 'desktop', reduced: true }, async (page) => {
  // 9. Reduced motion
  await page.goto(ORIGIN + '/app', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('a[href="/app/tasks?scope=all&open=1"] p'); await page.waitForTimeout(60)
  const early = await page.evaluate(() => ({ kpi: document.querySelector('a[href="/app/tasks?scope=all&open=1"] p')?.textContent?.trim(), moving: [...document.querySelectorAll('main *')].filter((e) => { if (e.closest('[role="progressbar"]')) return false /* scaleX is the bar's final state */; const t = getComputedStyle(e).transform; return t && t !== 'none' && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t) }).map((e) => `${e.tagName}.${String(e.className).slice(0, 30)}`), anims: document.getAnimations().length }))
  check('reduced motion: KPI numbers show their final value immediately', early.kpi === '11', `saw "${early.kpi}"`)
  check('reduced motion: no element is mid-transform shortly after load', early.moving.length === 0, early.moving.join(' | '))
})

await session({ viewport: 'desktop' }, async (page) => {
  // 10. Load performance indicators (software-rendered Chromium: use as relative signals, not absolute budgets)
  await page.addInitScript(() => { window.__perf = { cls: 0, long: 0, longMs: 0 }; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__perf.cls += e.value })).observe({ type: 'layout-shift', buffered: true }); new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__perf.long++; window.__perf.longMs += e.duration })).observe({ type: 'longtask', buffered: true }) })
  await page.goto(ORIGIN + '/app', { waitUntil: 'networkidle' }); await page.waitForTimeout(3500)
  const p = await page.evaluate(() => window.__perf)
  check('dashboard cumulative layout shift < 0.1', p.cls < 0.1, `CLS ${p.cls.toFixed(3)}`)
  check('dashboard long tasks (>50 ms) total under 600 ms', p.longMs < 600, `${p.long} tasks, ${Math.round(p.longMs)} ms`)
})
server.kill()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exitCode = 1
