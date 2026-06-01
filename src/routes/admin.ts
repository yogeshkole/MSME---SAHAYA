import { Hono } from 'hono'
import { authMiddleware, adminOnly, audit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>()
admin.use('*', authMiddleware, adminOnly)

// Analytics dashboard
admin.get('/analytics', async (c) => {
  const users = await c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<any>()
  const apps = await c.env.DB.prepare('SELECT COUNT(*) as n FROM applications').first<any>()
  const approved = await c.env.DB.prepare("SELECT COUNT(*) as n FROM applications WHERE status = 'approved'").first<any>()
  const pending = await c.env.DB.prepare("SELECT COUNT(*) as n FROM applications WHERE status IN ('submitted','under_review')").first<any>()
  const docs = await c.env.DB.prepare('SELECT COUNT(*) as n FROM documents').first<any>()
  const schemes = await c.env.DB.prepare('SELECT COUNT(*) as n FROM schemes WHERE active = 1').first<any>()
  return c.json({
    total_users: users.n, total_applications: apps.n, approved_applications: approved.n,
    pending_applications: pending.n, total_documents: docs.n, active_schemes: schemes.n
  })
})

// User management
admin.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, email, full_name, role, status, created_at FROM users ORDER BY id DESC LIMIT 100').all()
  return c.json({ users: results })
})

admin.put('/users/:id/status', async (c) => {
  const { status } = await c.req.json().catch(() => ({}))
  if (!['active', 'suspended'].includes(status)) return c.json({ error: 'Invalid status' }, 400)
  await c.env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(status, c.req.param('id')).run()
  await audit(c, 'admin_user_status', 'user', `${c.req.param('id')}:${status}`)
  return c.json({ message: 'User status updated' })
})

// Scheme management
admin.post('/schemes', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (!b.code || !b.name) return c.json({ error: 'code and name required' }, 400)
  const res = await c.env.DB.prepare(`INSERT INTO schemes
    (code, name, ministry, category, description, max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover, required_docs, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(b.code, b.name, b.ministry || null, b.category || null, b.description || null, b.max_benefit || 0, b.subsidy_pct || 0, b.interest_rate || 0,
      b.eligible_size || '', b.eligible_category || '', b.min_turnover || 0, b.max_turnover || 999999999, b.required_docs || '', b.deadline || null).run()
  await audit(c, 'admin_create_scheme', 'scheme', b.code)
  return c.json({ id: res.meta.last_row_id, message: 'Scheme created' }, 201)
})

admin.put('/schemes/:id', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const fields = ['name', 'ministry', 'category', 'description', 'max_benefit', 'subsidy_pct', 'interest_rate', 'eligible_size', 'eligible_category', 'min_turnover', 'max_turnover', 'required_docs', 'deadline', 'active']
  const sets: string[] = []; const vals: any[] = []
  for (const f of fields) if (b[f] !== undefined) { sets.push(`${f} = ?`); vals.push(b[f]) }
  if (!sets.length) return c.json({ error: 'No fields' }, 400)
  vals.push(c.req.param('id'))
  await c.env.DB.prepare(`UPDATE schemes SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  return c.json({ message: 'Scheme updated' })
})

// Application review
admin.get('/applications', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT a.*, u.full_name, u.email, s.name as scheme_name
    FROM applications a JOIN users u ON u.id = a.user_id JOIN schemes s ON s.id = a.scheme_id ORDER BY a.updated_at DESC LIMIT 100`).all()
  return c.json({ applications: results })
})

admin.put('/applications/:id/review', async (c) => {
  const { status, review_notes, rejection_reason } = await c.req.json().catch(() => ({}))
  if (!['under_review', 'approved', 'rejected'].includes(status)) return c.json({ error: 'Invalid status' }, 400)
  const app: any = await c.env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(c.req.param('id')).first()
  if (!app) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare("UPDATE applications SET status = ?, review_notes = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(status, review_notes || null, rejection_reason || null, app.id).run()
  await c.env.DB.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .bind(app.user_id, `Application ${status}`, review_notes || rejection_reason || `Your application status changed to ${status}.`, status === 'approved' ? 'success' : status === 'rejected' ? 'alert' : 'info').run()
  await audit(c, 'admin_review', 'application', `${app.id}:${status}`)
  return c.json({ message: 'Application reviewed' })
})

// Audit logs + KYC monitoring
admin.get('/audit-logs', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all()
  return c.json({ logs: results })
})

admin.get('/kyc-monitor', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT v.*, u.full_name, u.email FROM verification_records v JOIN users u ON u.id = v.user_id ORDER BY v.created_at DESC LIMIT 100`).all()
  return c.json({ records: results })
})

// Support tickets
admin.get('/tickets', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT t.*, u.full_name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 100`).all()
  return c.json({ tickets: results })
})

export default admin
