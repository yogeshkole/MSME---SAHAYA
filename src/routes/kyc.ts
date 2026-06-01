import { Hono } from 'hono'
import { authMiddleware, audit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const kyc = new Hono<{ Bindings: Bindings; Variables: Variables }>()
kyc.use('*', authMiddleware)

const KYC_TYPES = ['aadhaar', 'pan', 'gst', 'bank', 'face']

// Validators (format-level, mimicking real verification API responses)
function validateRef(type: string, ref: string): boolean {
  if (!ref) return false
  switch (type) {
    case 'aadhaar': return /^\d{12}$/.test(ref.replace(/\s/g, ''))
    case 'pan': return /^[A-Z]{5}\d{4}[A-Z]$/.test(ref.toUpperCase())
    case 'gst': return /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d$/.test(ref.toUpperCase())
    case 'bank': return /^\d{9,18}$/.test(ref)
    case 'face': return true
    default: return false
  }
}

// Submit a KYC verification request
kyc.post('/verify', async (c) => {
  const uid = c.get('userId')
  const { kyc_type, reference_number } = await c.req.json().catch(() => ({}))
  if (!KYC_TYPES.includes(kyc_type)) return c.json({ error: 'Invalid kyc_type', allowed: KYC_TYPES }, 400)

  const valid = validateRef(kyc_type, reference_number || '')
  const status = valid ? 'verified' : 'failed'
  const resultData = {
    verified: valid,
    provider: 'MSME-Sahay-KYC-Gateway',
    message: valid ? `${kyc_type.toUpperCase()} verified successfully` : `Invalid ${kyc_type} format`,
    timestamp: new Date().toISOString()
  }
  const res = await c.env.DB.prepare(
    "INSERT INTO verification_records (user_id, kyc_type, reference_number, status, result_data, verified_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(uid, kyc_type, reference_number || null, status, JSON.stringify(resultData), valid ? new Date().toISOString() : null).run()

  await audit(c, 'kyc_verify', 'kyc', `${kyc_type}:${status}`)
  return c.json({ id: res.meta.last_row_id, kyc_type, status, result: resultData }, valid ? 200 : 422)
})

// KYC status overview
kyc.get('/status', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT kyc_type, status, reference_number, verified_at, created_at FROM verification_records WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(uid).all()
  const summary: Record<string, string> = {}
  for (const t of KYC_TYPES) summary[t] = 'pending'
  for (const r of results as any[]) {
    if (summary[r.kyc_type] === 'pending' || r.status === 'verified') summary[r.kyc_type] = r.status
  }
  const verifiedCount = Object.values(summary).filter((s) => s === 'verified').length
  return c.json({ summary, completion_pct: Math.round((verifiedCount / KYC_TYPES.length) * 100), records: results })
})

export default kyc
