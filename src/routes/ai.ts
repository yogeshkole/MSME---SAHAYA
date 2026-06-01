import { Hono } from 'hono'
import { authMiddleware } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const ai = new Hono<{ Bindings: Bindings; Variables: Variables }>()
ai.use('*', authMiddleware)

// Context-aware AI assistant. Uses the user's real profile, documents, eligibility
// and finances to craft a relevant reply (deterministic rule-based reasoning).
// Can be swapped for OpenAI/Gemini by calling fetch() to their REST API here.
ai.post('/chat', async (c) => {
  const uid = c.get('userId')
  const { message } = await c.req.json().catch(() => ({}))
  if (!message) return c.json({ error: 'message required' }, 400)

  const prof: any = await c.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(uid).first()
  const docs = await c.env.DB.prepare('SELECT DISTINCT doc_type FROM documents WHERE user_id = ?').bind(uid).all()
  const owned = new Set((docs.results as any[]).map((d) => d.doc_type))
  const topElig: any = await c.env.DB.prepare(
    'SELECT s.name, e.score FROM eligibility_results e JOIN schemes s ON s.id = e.scheme_id WHERE e.user_id = ? ORDER BY e.score DESC LIMIT 1'
  ).bind(uid).first()

  const msg = message.toLowerCase()
  let reply = ''

  if (msg.includes('scheme') || msg.includes('eligib') || msg.includes('loan') || msg.includes('subsidy')) {
    reply = topElig
      ? `Based on your ${prof?.business_size || 'Micro'} ${prof?.business_category || 'Manufacturing'} profile, your top match is "${topElig.name}" with an eligibility score of ${topElig.score}/100. Run the eligibility engine for the full ranked list.`
      : `I can recommend schemes once you compute eligibility. Go to Scheme Eligibility and click "Check Eligibility" — I'll rank all schemes for your ${prof?.business_category || 'business'} profile.`
  } else if (msg.includes('document') || msg.includes('upload') || msg.includes('udyam') || msg.includes('pan') || msg.includes('gst')) {
    const missing = ['udyam', 'gst', 'pan'].filter((d) => !owned.has(d))
    reply = missing.length
      ? `You're missing these documents: ${missing.join(', ').toUpperCase()}. Uploading them will increase your eligibility scores and unlock more schemes. Would you like to upload now?`
      : `Your core documents (PAN, GST, Udyam) are all on file. You're well-prepared to apply for collateral-free credit schemes.`
  } else if (msg.includes('finance') || msg.includes('profit') || msg.includes('revenue') || msg.includes('health')) {
    reply = `Visit the Finance dashboard for your live revenue/expense trends and health score. I analyze margin, growth and consistency to compute a Funding Readiness Score that lenders look at.`
  } else if (msg.includes('hi') || msg.includes('hello') || msg.includes('help')) {
    reply = `Hello ${prof?.business_name || 'there'}! I'm your AI Business Assistant. I can help with scheme eligibility, document readiness, financial insights, and application guidance. What would you like to know?`
  } else {
    reply = `Great question! Based on your profile (${prof?.business_size || 'Micro'} · ${prof?.business_category || 'Manufacturing'}), I'd recommend checking your scheme eligibility and ensuring all KYC documents are verified. Ask me about schemes, documents, or finances for specifics.`
  }

  await c.env.DB.prepare('INSERT INTO ai_recommendations (user_id, kind, prompt, response) VALUES (?, ?, ?, ?)')
    .bind(uid, 'chat', message, reply).run()
  return c.json({ reply, timestamp: new Date().toISOString() })
})

// AI financial/scheme recommendations summary
ai.get('/recommendations', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT s.name, s.code, e.score, e.eligible FROM eligibility_results e JOIN schemes s ON s.id = e.scheme_id WHERE e.user_id = ? AND e.eligible = 1 ORDER BY e.score DESC LIMIT 5'
  ).bind(uid).all()
  return c.json({ recommendations: results })
})

// Chat history
ai.get('/history', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare("SELECT prompt, response, created_at FROM ai_recommendations WHERE user_id = ? AND kind = 'chat' ORDER BY created_at DESC LIMIT 30").bind(uid).all()
  return c.json({ history: results })
})

export default ai
