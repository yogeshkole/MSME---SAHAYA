import { Hono } from 'hono'
import { authMiddleware } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const notif = new Hono<{ Bindings: Bindings; Variables: Variables }>()
notif.use('*', authMiddleware)

notif.get('/', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(uid).all()
  const unread = (results as any[]).filter((n) => !n.read).length
  return c.json({ notifications: results, unread_count: unread })
})

notif.post('/:id/read', async (c) => {
  const uid = c.get('userId')
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).run()
  return c.json({ message: 'Marked as read' })
})

notif.post('/read-all', async (c) => {
  const uid = c.get('userId')
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(uid).run()
  return c.json({ message: 'All marked as read' })
})

notif.delete('/:id', async (c) => {
  const uid = c.get('userId')
  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).run()
  return c.json({ message: 'Deleted' })
})

export default notif
