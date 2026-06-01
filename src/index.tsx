import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings, Variables } from './lib/types'

import auth from './routes/auth'
import profile from './routes/profile'
import documents from './routes/documents'
import kyc from './routes/kyc'
import schemes from './routes/schemes'
import applications from './routes/applications'
import finance from './routes/finance'
import notifications from './routes/notifications'
import ai from './routes/ai'
import admin from './routes/admin'
import support from './routes/support'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('*', logger())
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }))

// Security headers
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'SAMEORIGIN')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
})

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'MSME Sahay API', time: new Date().toISOString() }))

// API routes
app.route('/api/auth', auth)
app.route('/api/profile', profile)
app.route('/api/documents', documents)
app.route('/api/kyc', kyc)
app.route('/api/schemes', schemes)
app.route('/api/applications', applications)
app.route('/api/finance', finance)
app.route('/api/notifications', notifications)
app.route('/api/ai', ai)
app.route('/api/admin', admin)
app.route('/api/support', support)

// Static assets
app.use('/static/*', serveStatic({ root: './public' }))

// API 404
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

export default app
