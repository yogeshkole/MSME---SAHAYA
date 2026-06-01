import { Hono } from 'hono'
import { hashPassword, verifyPassword, signJWT, randomToken, randomOTP, uuid } from '../lib/crypto'
import { authMiddleware, audit, rateLimit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const ACCESS_TTL = 60 * 60        // 1h
const REFRESH_TTL = 60 * 60 * 24 * 30 // 30d

async function issueTokens(c: any, user: any, method: string) {
  const accessToken = await signJWT({ sub: user.id, role: user.role, email: user.email }, c.env.JWT_SECRET, ACCESS_TTL)
  const refreshToken = randomToken()
  const sessionId = uuid()
  const expires = new Date(Date.now() + REFRESH_TTL * 1000).toISOString()
  const device = c.req.header('user-agent') || 'unknown'
  const ip = c.req.header('cf-connecting-ip') || 'local'
  await c.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, refresh_token, device, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(sessionId, user.id, refreshToken, device, ip, expires).run()
  await c.env.DB.prepare('INSERT INTO login_history (user_id, method, ip_address, device, success) VALUES (?, ?, ?, ?, 1)')
    .bind(user.id, method, ip, device).run()
  return { accessToken, refreshToken, sessionId }
}

function publicUser(u: any) {
  return { id: u.id, email: u.email, phone: u.phone, full_name: u.full_name, role: u.role, status: u.status, email_verified: u.email_verified, phone_verified: u.phone_verified }
}

// ---------- Register ----------
auth.post('/register', rateLimit(10, 60000), async (c) => {
  const { email, password, full_name, phone } = await c.req.json().catch(() => ({}))
  if (!email || !password || !full_name) return c.json({ error: 'email, password and full_name are required' }, 400)
  if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  const { hash, salt } = await hashPassword(password)
  const res = await c.env.DB.prepare(
    'INSERT INTO users (email, phone, password_hash, password_salt, full_name, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(email, phone || null, hash, salt, full_name, 'user').run()
  const userId = res.meta.last_row_id

  await c.env.DB.prepare('INSERT INTO profiles (user_id, business_size, business_category) VALUES (?, ?, ?)')
    .bind(userId, 'Micro', 'Manufacturing').run()
  await c.env.DB.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .bind(userId, 'Welcome to MSME Sahay!', 'Complete your profile to unlock personalized scheme recommendations.', 'success').run()

  const user = { id: userId, email, phone, full_name, role: 'user', status: 'active', email_verified: 0, phone_verified: 0 }
  const tokens = await issueTokens(c, user, 'password')
  await audit(c, 'register', 'user', email)
  return c.json({ user: publicUser(user), ...tokens }, 201)
})

// ---------- Login (email/password) ----------
auth.post('/login', rateLimit(20, 60000), async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}))
  if (!email || !password) return c.json({ error: 'email and password are required' }, 400)

  const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!user || !user.password_hash) return c.json({ error: 'Invalid credentials' }, 401)
  if (user.status !== 'active') return c.json({ error: 'Account suspended' }, 403)

  const ok = await verifyPassword(password, user.password_hash, user.password_salt)
  if (!ok) {
    await c.env.DB.prepare('INSERT INTO login_history (user_id, method, success) VALUES (?, ?, 0)').bind(user.id, 'password').run()
    return c.json({ error: 'Invalid credentials' }, 401)
  }
  const tokens = await issueTokens(c, user, 'password')
  await audit(c, 'login', 'user', email)
  return c.json({ user: publicUser(user), ...tokens })
})

// ---------- OTP: request ----------
auth.post('/otp/request', rateLimit(10, 60000), async (c) => {
  const { identifier, purpose } = await c.req.json().catch(() => ({}))
  if (!identifier) return c.json({ error: 'identifier (email or phone) required' }, 400)
  const code = randomOTP(6)
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  await c.env.DB.prepare('INSERT INTO otp_codes (identifier, code, purpose, expires_at) VALUES (?, ?, ?, ?)')
    .bind(identifier, code, purpose || 'login', expires).run()
  // In production, send via SMS/email gateway. For demo, return it (dev_otp).
  return c.json({ message: 'OTP sent', dev_otp: code, expires_in: 300 })
})

// ---------- OTP: verify (login or create account) ----------
auth.post('/otp/verify', rateLimit(20, 60000), async (c) => {
  const { identifier, code } = await c.req.json().catch(() => ({}))
  if (!identifier || !code) return c.json({ error: 'identifier and code required' }, 400)

  const row: any = await c.env.DB.prepare(
    "SELECT * FROM otp_codes WHERE identifier = ? AND code = ? AND consumed = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1"
  ).bind(identifier, code).first()
  if (!row) return c.json({ error: 'Invalid or expired OTP' }, 401)
  await c.env.DB.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').bind(row.id).run()

  const isEmail = identifier.includes('@')
  let user: any = await c.env.DB.prepare(`SELECT * FROM users WHERE ${isEmail ? 'email' : 'phone'} = ?`).bind(identifier).first()
  if (!user) {
    const email = isEmail ? identifier : `${identifier}@otp.msme`
    const res = await c.env.DB.prepare(
      'INSERT INTO users (email, phone, full_name, role, phone_verified, email_verified) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(email, isEmail ? null : identifier, 'MSME User', 'user', isEmail ? 0 : 1, isEmail ? 1 : 0).run()
    const userId = res.meta.last_row_id
    await c.env.DB.prepare('INSERT INTO profiles (user_id, business_size, business_category) VALUES (?, ?, ?)')
      .bind(userId, 'Micro', 'Manufacturing').run()
    user = { id: userId, email, phone: isEmail ? null : identifier, full_name: 'MSME User', role: 'user', status: 'active' }
  }
  const tokens = await issueTokens(c, user, 'otp')
  await audit(c, 'login_otp', 'user', identifier)
  return c.json({ user: publicUser(user), ...tokens })
})

// ---------- OAuth (simulated social login) ----------
auth.post('/oauth/:provider', rateLimit(20, 60000), async (c) => {
  const provider = c.req.param('provider')
  const { email, full_name } = await c.req.json().catch(() => ({}))
  const userEmail = email || `demo.${provider}@msme.in`
  let user: any = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(userEmail).first()
  if (!user) {
    const res = await c.env.DB.prepare(
      'INSERT INTO users (email, full_name, role, oauth_provider, email_verified) VALUES (?, ?, ?, ?, 1)'
    ).bind(userEmail, full_name || 'Yogesh Sharma', 'user', provider).run()
    const userId = res.meta.last_row_id
    await c.env.DB.prepare('INSERT INTO profiles (user_id, business_size, business_category) VALUES (?, ?, ?)')
      .bind(userId, 'Micro', 'Manufacturing').run()
    user = { id: userId, email: userEmail, full_name: full_name || 'Yogesh Sharma', role: 'user', status: 'active' }
  }
  const tokens = await issueTokens(c, user, provider)
  await audit(c, 'login_oauth', 'user', `${provider}:${userEmail}`)
  return c.json({ user: publicUser(user), ...tokens })
})

// ---------- Refresh token ----------
auth.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json().catch(() => ({}))
  if (!refreshToken) return c.json({ error: 'refreshToken required' }, 400)
  const session: any = await c.env.DB.prepare(
    "SELECT * FROM sessions WHERE refresh_token = ? AND revoked = 0 AND expires_at > datetime('now')"
  ).bind(refreshToken).first()
  if (!session) return c.json({ error: 'Invalid or expired refresh token' }, 401)
  const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first()
  if (!user) return c.json({ error: 'User not found' }, 401)
  const accessToken = await signJWT({ sub: user.id, role: user.role, email: user.email }, c.env.JWT_SECRET, ACCESS_TTL)
  return c.json({ accessToken })
})

// ---------- Logout ----------
auth.post('/logout', authMiddleware, async (c) => {
  const { refreshToken } = await c.req.json().catch(() => ({}))
  if (refreshToken) await c.env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE refresh_token = ?').bind(refreshToken).run()
  await audit(c, 'logout', 'user')
  return c.json({ message: 'Logged out' })
})

// ---------- Current user ----------
auth.get('/me', authMiddleware, async (c) => {
  const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first()
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json({ user: publicUser(user) })
})

export default auth
