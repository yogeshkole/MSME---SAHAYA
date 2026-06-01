import { Hono } from 'hono'
import { authMiddleware, audit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const apps = new Hono<{ Bindings: Bindings; Variables: Variables }>()
apps.use('*', authMiddleware)

apps.get('/', async (c) => {
  const uid = c.get('userId')
  const status = c.req.query('status')
  let sql = `SELECT a.*, s.name as scheme_name, s.code as scheme_code, s.category
             FROM applications a JOIN schemes s ON s.id = a.scheme_id WHERE a.user_id = ?`
  const binds: any[] = [uid]
  if (status) { sql += ' AND a.status = ?'; binds.push(status) }
  sql += ' ORDER BY a.updated_at DESC'
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ applications: (results as any[]).map((a) => ({ ...a, form_data: a.form_data ? JSON.parse(a.form_data) : {} })) })
})

// Create draft
apps.post('/', async (c) => {
  const uid = c.get('userId')
  const { scheme_id, amount_requested, form_data } = await c.req.json().catch(() => ({}))
  if (!scheme_id) return c.json({ error: 'scheme_id required' }, 400)
  const scheme = await c.env.DB.prepare('SELECT id FROM schemes WHERE id = ?').bind(scheme_id).first()
  if (!scheme) return c.json({ error: 'Scheme not found' }, 404)
  const res = await c.env.DB.prepare(
    'INSERT INTO applications (user_id, scheme_id, status, amount_requested, form_data) VALUES (?, ?, ?, ?, ?)'
  ).bind(uid, scheme_id, 'draft', amount_requested || 0, JSON.stringify(form_data || {})).run()
  await audit(c, 'create_application', 'application', String(res.meta.last_row_id))
  return c.json({ id: res.meta.last_row_id, message: 'Draft application created' }, 201)
})

// Auto-save draft
apps.put('/:id', async (c) => {
  const uid = c.get('userId')
  const { amount_requested, form_data } = await c.req.json().catch(() => ({}))
  const app: any = await c.env.DB.prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).first()
  if (!app) return c.json({ error: 'Not found' }, 404)
  if (app.status !== 'draft') return c.json({ error: 'Only drafts can be edited' }, 400)
  await c.env.DB.prepare("UPDATE applications SET amount_requested = ?, form_data = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(amount_requested ?? app.amount_requested, JSON.stringify(form_data || {}), app.id).run()
  return c.json({ message: 'Saved', auto_saved_at: new Date().toISOString() })
})

// Submit
apps.post('/:id/submit', async (c) => {
  const uid = c.get('userId')
  const app: any = await c.env.DB.prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).first()
  if (!app) return c.json({ error: 'Not found' }, 404)
  if (app.status !== 'draft') return c.json({ error: 'Already submitted' }, 400)

  // Document validation: ensure scheme required docs present
  const scheme: any = await c.env.DB.prepare('SELECT * FROM schemes WHERE id = ?').bind(app.scheme_id).first()
  const reqDocs = (scheme.required_docs || '').split(',').map((x: string) => x.trim()).filter(Boolean)
  const docs = await c.env.DB.prepare('SELECT DISTINCT doc_type FROM documents WHERE user_id = ?').bind(uid).all()
  const owned = new Set((docs.results as any[]).map((d) => d.doc_type))
  const missing = reqDocs.filter((d: string) => !owned.has(d))
  if (missing.length) return c.json({ error: 'Missing required documents', missing }, 422)

  const refNo = 'MSME' + Date.now().toString().slice(-8)
  await c.env.DB.prepare("UPDATE applications SET status = 'submitted', reference_no = ?, submitted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .bind(refNo, app.id).run()
  await c.env.DB.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .bind(uid, 'Application submitted', `Your application for ${scheme.name} (Ref: ${refNo}) is under review.`, 'success').run()
  await audit(c, 'submit_application', 'application', refNo)
  return c.json({ message: 'Application submitted', reference_no: refNo, status: 'submitted' })
})

apps.get('/:id', async (c) => {
  const uid = c.get('userId')
  const app: any = await c.env.DB.prepare(`SELECT a.*, s.name as scheme_name, s.code as scheme_code FROM applications a JOIN schemes s ON s.id = a.scheme_id WHERE a.id = ? AND a.user_id = ?`).bind(c.req.param('id'), uid).first()
  if (!app) return c.json({ error: 'Not found' }, 404)
  app.form_data = app.form_data ? JSON.parse(app.form_data) : {}
  return c.json({ application: app })
})

// Resubmit rejected
apps.post('/:id/resubmit', async (c) => {
  const uid = c.get('userId')
  const app: any = await c.env.DB.prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).first()
  if (!app) return c.json({ error: 'Not found' }, 404)
  if (app.status !== 'rejected') return c.json({ error: 'Only rejected applications can be resubmitted' }, 400)
  await c.env.DB.prepare("UPDATE applications SET status = 'submitted', rejection_reason = NULL, updated_at = datetime('now'), submitted_at = datetime('now') WHERE id = ?").bind(app.id).run()
  await audit(c, 'resubmit_application', 'application', String(app.id))
  return c.json({ message: 'Application resubmitted', status: 'submitted' })
})

export default apps
