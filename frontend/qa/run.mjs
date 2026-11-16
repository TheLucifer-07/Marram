// Screenshot + metrics pass over every page, theme and viewport.
// Usage: node qa/run.mjs [--viewports=desktop,mobile] [--themes=light,dark] [--only=dashboard,tasks] [--out=qa/shots]
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { build, serve, launch, context, ORIGIN, VIEWPORTS } from './harness.mjs'

const require = createRequire(import.meta.url)
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d)
const viewports = arg('viewports', Object.keys(VIEWPORTS).join(',')).split(',')
const themes = arg('themes', 'light,dark').split(',')
const only = arg('only', '').split(',').filter(Boolean)
const out = arg('out', 'qa/shots')
fs.mkdirSync(out, { recursive: true })

const clickText = (page, role, name) => page.getByRole(role, { name }).first().click()
const SCENES = [
  { name: 'landing', path: '/', auth: false },
  { name: 'login', path: '/login', auth: false },
  { name: 'register', path: '/register', auth: false },
  { name: 'not-found', path: '/nope', auth: false },
  { name: 'onboarding', path: '/onboarding', empty: true },
  { name: 'dashboard', path: '/app' },
  { name: 'projects-grid', path: '/app/projects' },
  { name: 'projects-list', path: '/app/projects', act: async (p) => clickText(p, 'button', 'List') },
  { name: 'project-list', path: '/app/projects/1' },
  { name: 'project-board', path: '/app/projects/1', act: async (p) => clickText(p, 'button', 'Board') },
  { name: 'tasks', path: '/app/tasks?scope=all' },
  { name: 'task-details', path: '/app/tasks/2' },
  { name: 'members', path: '/app/members' },
  { name: 'members-drawer', path: '/app/members', act: async (p) => clickText(p, 'button', /View work for Arjun/) },
  { name: 'settings', path: '/app/settings' },
  { name: 'new-task-modal', path: '/app/projects/1', act: async (p) => clickText(p, 'button', 'New task') },
  { name: 'mobile-nav', path: '/app', only: ['mobile', 'mobile-s', 'tablet'], act: async (p) => clickText(p, 'button', 'Open menu') },
]

build()
const server = await serve()
const report = []
// The bundled Chromium runs single-process: closing a context or page can take the browser down, so each
// (viewport, theme, variant) group gets a fresh browser and a single page that navigates between scenes.
const variantOf = (s) => (s.auth === false ? 'public' : s.empty ? 'empty' : 'auth')
for (const viewport of viewports) for (const theme of themes) for (const variant of ['public', 'empty', 'auth']) {
  const scenes = SCENES.filter((s) => variantOf(s) === variant && (!only.length || only.includes(s.name)) && (!s.only || s.only.includes(viewport)))
  if (!scenes.length) continue
  const browser = await launch()
  const { ctx } = await context(browser, { viewport, theme, auth: variant !== 'public', empty: variant === 'empty' })
  const page = await ctx.newPage()
  let errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
  for (const s of scenes) {
    errors = []
    try {
      await page.goto(ORIGIN + s.path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      if (s.act) { await s.act(page); await page.waitForTimeout(450) }
      // Scroll through the page so whileInView reveals fire, then let charts finish (software rendering is slow).
      await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)) } window.scrollTo(0, 0) })
      await page.waitForTimeout(s.name === 'dashboard' ? 3000 : 1000)
      const file = `${out}/${s.name}__${viewport}__${theme}.png`
      await page.screenshot({ path: file, fullPage: !['mobile-nav', 'new-task-modal', 'members-drawer'].includes(s.name) })
      const m = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth, h: document.documentElement.scrollHeight }))
      await page.evaluate(axeSource)
      const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ')?.slice(0, 90) })))
      report.push({ scene: s.name, viewport, theme, overflow: m.overflow, height: m.h, errors: [...errors], axe })
    } catch (e) { report.push({ scene: s.name, viewport, theme, fatal: String(e).slice(0, 200) }) }
  }
  await browser.close().catch(() => {})
}
server.kill()
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1))
const bad = report.filter((r) => r.fatal || r.overflow > 1 || r.errors?.length || r.axe?.length)
console.log(`${report.length} captures, ${bad.length} with findings`)
const agg = {}
for (const r of report) for (const a of r.axe ?? []) { const k = `${a.id} (${a.impact})`; (agg[k] ??= { count: 0, scenes: new Set() }).count += a.nodes; agg[k].scenes.add(`${r.scene}/${r.theme}`) }
for (const [k, v] of Object.entries(agg)) console.log('axe', k, 'nodes:', v.count, 'e.g.', [...v.scenes].slice(0, 4).join(', '))
for (const r of report) { if (r.fatal) console.log('FATAL', r.scene, r.viewport, r.theme, r.fatal); if (r.overflow > 1) console.log('OVERFLOW', r.scene, r.viewport, r.theme, r.overflow + 'px'); if (r.errors?.length) console.log('CONSOLE', r.scene, r.viewport, r.theme, r.errors[0]) }
