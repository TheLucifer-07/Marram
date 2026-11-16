// Shared QA harness: serves the production bundle, fakes Supabase's session and the Spring API with qa/fixtures.js.
import { spawn, execSync } from 'node:child_process'
import chromium from '@sparticuz/chromium'
import { chromium as pw } from 'playwright-core'
import * as fx from './fixtures.js'

export const ORIGIN = 'http://localhost:4173'
const REF = 'qa-project'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const FAKE_JWT = `${b64({ alg: 'ES256', typ: 'JWT' })}.${b64({ sub: 'qa-user', role: 'authenticated', exp: 4102444800 })}.sig`

export function build() {
  execSync('npx vite build --outDir /tmp/qa-dist --emptyOutDir', { stdio: 'ignore', env: { ...process.env, VITE_SUPABASE_URL: `https://${REF}.supabase.co`, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_qa' } })
}
export async function serve() {
  const p = spawn('npx', ['vite', 'preview', '--outDir', '/tmp/qa-dist', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
  for (let i = 0; i < 40; i++) { try { if ((await fetch(ORIGIN)).ok) break } catch { /* wait */ } await new Promise((r) => setTimeout(r, 250)) }
  return p
}
export async function launch() {
  return pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true })
}

export const VIEWPORTS = { desktop: [1440, 900], laptop: [1280, 800], 'tablet-l': [1024, 768], tablet: [768, 1024], mobile: [390, 844], 'mobile-s': [360, 740] }

export function mockApi(store, { empty = false, role = 'OWNER' } = {}) {
  const me = fx.me
  return async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/api/v1', '')
    const q = Object.fromEntries(url.searchParams)
    const method = req.method()
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const dto = (t) => fx.taskDto(store, t, role, 1)
    const intq = (k, d) => (q[k] === undefined ? d : Number(q[k]))
    const filterTasks = (list) => {
      let r = list
      if (q.status) r = r.filter((t) => t.status === q.status)
      if (q.priority) r = r.filter((t) => t.priority === q.priority)
      if (q.assigneeId) r = r.filter((t) => String(t.assignee) === q.assigneeId)
      if (q.open === 'true') r = r.filter((t) => t.status !== 'DONE')
      if (q.overdue === 'true') r = r.filter((t) => t.status !== 'DONE' && t.due < new Date().toISOString().slice(0, 10))
      if (q.q) r = r.filter((t) => t.title.toLowerCase().includes(q.q.toLowerCase()))
      const [f, d] = (q.sort || 'createdAt,desc').split(',')
      const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }
      const key = { dueDate: (t) => t.due, priority: (t) => rank[t.priority], updatedAt: (t) => t.updated, title: (t) => t.title, createdAt: (t) => t.created, status: (t) => t.status }[f] || ((t) => t.created)
      r = [...r].sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0)); if (d === 'desc') r.reverse()
      return r
    }
    if (path === '/auth/me') return json(me)
    if (path === '/workspaces' && method === 'GET') return json(empty ? [] : [{ ...fx.workspace, myRole: role }])
    if (path === '/workspaces' && method === 'POST') return json({ ...fx.workspace, myRole: 'OWNER' }, 201)
    if (path === '/workspaces/1/dashboard') return json(fx.dashboardDto(store))
    if (path === '/workspaces/1/members') return json(fx.membersDto(store))
    if (path === '/workspaces/1/projects') { let ps = store.projects; if (q.status) ps = ps.filter((p) => p.status === q.status); if (q.q) ps = ps.filter((p) => p.name.toLowerCase().includes(q.q.toLowerCase())); return json(fx.page(ps.map((p) => fx.projectDto(store, p)), intq('page', 0), intq('size', 10))) }
    if (path === '/workspaces/1/tasks') return json(fx.page(filterTasks(store.tasks).map(dto), intq('page', 0), intq('size', 10)))
    let m
    if ((m = path.match(/^\/projects\/(\d+)$/))) return json(fx.projectDto(store, store.projects.find((p) => p.id === +m[1])))
    if ((m = path.match(/^\/projects\/(\d+)\/tasks$/))) return json(fx.page(filterTasks(store.tasks.filter((t) => t.project === +m[1])).map(dto), intq('page', 0), intq('size', 10)))
    if ((m = path.match(/^\/tasks\/(\d+)$/))) return json(dto(store.tasks.find((t) => t.id === +m[1])))
    if ((m = path.match(/^\/tasks\/(\d+)\/status$/)) && method === 'PATCH') {
      const t = store.tasks.find((x) => x.id === +m[1]); const to = JSON.parse(req.postData()).status
      if (!store.NEXT[t.status].includes(to)) return json({ title: 'Invalid Task Transition', status: 409, detail: `A task cannot move from ${t.status} to ${to}` }, 409)
      store.history.push({ id: store.history.length + 1, taskId: t.id, by: 1, field: 'status', o: t.status, n: to, at: new Date().toISOString() }); t.status = to; return json(dto(t))
    }
    if ((m = path.match(/^\/tasks\/(\d+)\/comments$/))) return json(fx.page(fx.commentsDto(store, +m[1]), 0, 20))
    if ((m = path.match(/^\/tasks\/(\d+)\/history$/))) return json(fx.page(fx.historyDto(store, +m[1]), 0, 15))
    return json({ title: 'Not Found', status: 404, detail: `QA mock has no route for ${method} ${path}` }, 404)
  }
}

/** Opens an isolated browser context. Pass auth:false for public pages. */
export async function context(browser, { viewport = 'desktop', theme = 'light', auth = true, reduced = false, store = fx.createStore(), empty = false, role = 'OWNER' } = {}) {
  const [width, height] = VIEWPORTS[viewport]
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1 })
  await ctx.addInitScript(({ theme, auth, ref, jwt }) => {
    try {
    if (!localStorage.getItem('marram.theme')) localStorage.setItem('marram.theme', theme)
    if (auth) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: jwt, refresh_token: 'qa', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: { id: 'qa-user', email: 'priya@example.com', aud: 'authenticated', role: 'authenticated' } }))
    } catch { /* about:blank has no storage */ }
  }, { theme, auth, ref: REF, jwt: FAKE_JWT })
  await ctx.route('**/api/v1/**', mockApi(store, { empty, role }))
  await ctx.route(`https://${REF}.supabase.co/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  return { ctx, store }
}
