import { Hono } from 'hono'
import { authMiddleware, audit } from '../lib/middleware'
import { hashPassword, verifyPassword } from '../lib/crypto'
import type { Bindings, Variables } from '../lib/types'

const profile = new Hono<{ Bindings: Bindings; Variables: Variables }>()
profile.use('*', authMiddleware)

// Get full profile (user + profile)
profile.get('/', async (c) => {
  const uid = c.get('userId')
  const user: any = await c.env.DB.prepare('SELECT id, email, phone, full_name, role, status FROM users WHERE id = ?').bind(uid).first()
  const prof: any = await c.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(uid).first()
  return c.json({ user, profile: prof })
})

// Update profile (personal + business + address + GST/PAN/Udyam)
profile.put('/', async (c) => {
  const uid = c.get('userId')
  const b = await c.req.json().catch(() => ({}))
  const fields = [
    'avatar_url', 'designation', 'business_name', 'business_category', 'business_size',
    'gst_number', 'pan_number', 'udyam_number', 'aadhaar_masked', 'annual_turnover',
    'employee_count', 'year_established', 'address_line', 'city', 'state', 'pincode'
  ]
  const sets: string[] = []
  const vals: any[] = []
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); vals.push(b[f]) }
  }
  if (sets.length) {
    sets.push("updated_at = datetime('now')")
    vals.push(uid)
    await c.env.DB.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`).bind(...vals).run()
  }
  if (b.full_name || b.phone) {
    await c.env.DB.prepare("UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), updated_at = datetime('now') WHERE id = ?")
      .bind(b.full_name || null, b.phone || null, uid).run()
  }
  await audit(c, 'update_profile', 'profile')
  const prof: any = await c.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(uid).first()
  return c.json({ message: 'Profile updated', profile: prof })
})

// Change password
profile.post('/change-password', async (c) => {
  const uid = c.get('userId')
  const { current_password, new_password } = await c.req.json().catch(() => ({}))
  if (!new_password || new_password.length < 6) return c.json({ error: 'New password must be at least 6 chars' }, 400)
  const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first()
  if (user.password_hash) {
    const ok = await verifyPassword(current_password || '', user.password_hash, user.password_salt)
    if (!ok) return c.json({ error: 'Current password incorrect' }, 401)
  }
  const { hash, salt } = await hashPassword(new_password)
  await c.env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(hash, salt, uid).run()
  await audit(c, 'change_password', 'user')
  return c.json({ message: 'Password changed successfully' })
})

// Notification preferences / security settings (stored as audit-style toggle in profile - simplified)
profile.post('/settings', async (c) => {
  const uid = c.get('userId')
  const { mfa_enabled } = await c.req.json().catch(() => ({}))
  if (mfa_enabled !== undefined) {
    await c.env.DB.prepare('UPDATE users SET mfa_enabled = ? WHERE id = ?').bind(mfa_enabled ? 1 : 0, uid).run()
  }
  await audit(c, 'update_settings', 'user')
  return c.json({ message: 'Settings updated' })
})

// Login history
profile.get('/login-history', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT method, ip_address, device, success, created_at FROM login_history WHERE user_id = ? ORDER BY id DESC LIMIT 20').bind(uid).all()
  return c.json({ history: results })
})

// Active devices/sessions
profile.get('/devices', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare("SELECT id, device, ip_address, created_at, revoked FROM sessions WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC").bind(uid).all()
  return c.json({ devices: results })
})

profile.delete('/devices/:id', async (c) => {
  const uid = c.get('userId')
  await c.env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).run()
  return c.json({ message: 'Device revoked' })
})

export default profile
