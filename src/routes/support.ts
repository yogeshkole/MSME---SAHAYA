import { Hono } from 'hono'
import { authMiddleware } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const support = new Hono<{ Bindings: Bindings; Variables: Variables }>()
support.use('*', authMiddleware)

support.get('/', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC').bind(uid).all()
  return c.json({ tickets: results })
})

support.post('/', async (c) => {
  const uid = c.get('userId')
  const { subject, message, priority } = await c.req.json().catch(() => ({}))
  if (!subject) return c.json({ error: 'subject required' }, 400)
  const res = await c.env.DB.prepare('INSERT INTO support_tickets (user_id, subject, message, priority) VALUES (?, ?, ?, ?)')
    .bind(uid, subject, message || null, priority || 'normal').run()
  return c.json({ id: res.meta.last_row_id, message: 'Support ticket created' }, 201)
})

export default support
