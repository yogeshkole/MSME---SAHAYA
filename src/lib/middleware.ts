import type { MiddlewareHandler } from 'hono'
import { verifyJWT } from './crypto'
import type { Bindings, Variables } from './types'

// Auth middleware: validates Bearer JWT, sets userId/role in context
export const authMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const auth = c.req.header('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return c.json({ error: 'Unauthorized', message: 'Missing token' }, 401)

  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || !payload.sub) return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401)

  c.set('userId', Number(payload.sub))
  c.set('userRole', payload.role || 'user')
  c.set('userEmail', payload.email || '')
  await next()
}

// Admin-only RBAC guard (use after authMiddleware)
export const adminOnly: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  if (c.get('userRole') !== 'admin') return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403)
  await next()
}

// Simple in-memory rate limiter per IP+path (best-effort within isolate)
const rlStore = new Map<string, { count: number; reset: number }>()
export function rateLimit(max = 30, windowMs = 60000): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'local'
    const key = `${ip}:${new URL(c.req.url).pathname}`
    const now = Date.now()
    const entry = rlStore.get(key)
    if (!entry || now > entry.reset) {
      rlStore.set(key, { count: 1, reset: now + windowMs })
    } else {
      entry.count++
      if (entry.count > max) return c.json({ error: 'Too Many Requests' }, 429)
    }
    await next()
  }
}

// Audit log helper
export async function audit(c: any, action: string, entity?: string, detail?: string) {
  try {
    const ip = c.req.header('cf-connecting-ip') || 'local'
    const userId = c.get('userId') || null
    await c.env.DB.prepare('INSERT INTO audit_logs (user_id, action, entity, detail, ip_address) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, action, entity || null, detail || null, ip)
      .run()
  } catch {
    /* non-fatal */
  }
}
