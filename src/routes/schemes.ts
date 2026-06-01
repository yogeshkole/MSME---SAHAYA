import { Hono } from 'hono'
import { authMiddleware, audit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const schemes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Public scheme catalog (no auth needed to browse)
schemes.get('/', async (c) => {
  const category = c.req.query('category')
  const search = c.req.query('search')
  let sql = 'SELECT * FROM schemes WHERE active = 1'
  const binds: any[] = []
  if (category) { sql += ' AND category = ?'; binds.push(category) }
  if (search) { sql += ' AND (name LIKE ? OR description LIKE ?)'; binds.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY max_benefit DESC'
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ schemes: results })
})

schemes.get('/:id', async (c) => {
  const s = await c.env.DB.prepare('SELECT * FROM schemes WHERE id = ?').bind(c.req.param('id')).first()
  if (!s) return c.json({ error: 'Not found' }, 404)
  return c.json({ scheme: s })
})

// ---------- Eligibility Engine ----------
// Scoring: size match (30) + category match (25) + turnover band (25) + documents readiness (20)
schemes.post('/eligibility/compute', authMiddleware, async (c) => {
  const uid = c.get('userId')
  const prof: any = await c.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(uid).first()
  if (!prof) return c.json({ error: 'Complete your profile first' }, 400)

  const docs = await c.env.DB.prepare('SELECT DISTINCT doc_type FROM documents WHERE user_id = ?').bind(uid).all()
  const ownedDocs = new Set((docs.results as any[]).map((d) => d.doc_type))

  const { results: allSchemes } = await c.env.DB.prepare('SELECT * FROM schemes WHERE active = 1').all()
  const computed: any[] = []

  await c.env.DB.prepare('DELETE FROM eligibility_results WHERE user_id = ?').bind(uid).run()

  for (const s of allSchemes as any[]) {
    let score = 0
    const reasons: string[] = []

    const sizes = (s.eligible_size || '').split(',').map((x: string) => x.trim()).filter(Boolean)
    if (!sizes.length || sizes.includes(prof.business_size)) { score += 30; reasons.push(`Business size '${prof.business_size}' matches`) }
    else reasons.push(`Requires: ${sizes.join('/')}`)

    const cats = (s.eligible_category || '').split(',').map((x: string) => x.trim()).filter(Boolean)
    if (!cats.length || cats.includes(prof.business_category)) { score += 25; reasons.push(`Category '${prof.business_category}' matches`) }
    else reasons.push(`Requires category: ${cats.join('/')}`)

    const turnover = prof.annual_turnover || 0
    if (turnover >= (s.min_turnover || 0) && turnover <= (s.max_turnover || 9e12)) { score += 25; reasons.push('Turnover within eligible band') }
    else reasons.push('Turnover outside eligible band')

    const reqDocs = (s.required_docs || '').split(',').map((x: string) => x.trim()).filter(Boolean)
    const haveAll = reqDocs.every((d: string) => ownedDocs.has(d))
    const haveCount = reqDocs.filter((d: string) => ownedDocs.has(d)).length
    if (reqDocs.length === 0) { score += 20 }
    else { score += Math.round((haveCount / reqDocs.length) * 20); if (!haveAll) reasons.push(`Missing docs: ${reqDocs.filter((d: string) => !ownedDocs.has(d)).join(', ')}`) }

    const eligible = score >= 60 ? 1 : 0
    await c.env.DB.prepare(
      'INSERT INTO eligibility_results (user_id, scheme_id, score, eligible, reasons) VALUES (?, ?, ?, ?, ?)'
    ).bind(uid, s.id, score, eligible, JSON.stringify(reasons)).run()
    computed.push({ scheme_id: s.id, name: s.name, code: s.code, category: s.category, max_benefit: s.max_benefit, deadline: s.deadline, score, eligible: !!eligible, reasons })
  }

  computed.sort((a, b) => b.score - a.score)
  await audit(c, 'compute_eligibility', 'scheme', `${computed.length} schemes`)
  const eligibleCount = computed.filter((x) => x.eligible).length
  return c.json({ total: computed.length, eligible_count: eligibleCount, readiness_score: Math.round(computed.reduce((a, b) => a + b.score, 0) / (computed.length || 1)), results: computed })
})

// Get saved eligibility results (ranked)
schemes.get('/eligibility/results', authMiddleware, async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare(`
    SELECT e.*, s.name, s.code, s.category, s.max_benefit, s.subsidy_pct, s.deadline, s.ministry, s.description
    FROM eligibility_results e JOIN schemes s ON s.id = e.scheme_id
    WHERE e.user_id = ? ORDER BY e.score DESC
  `).bind(uid).all()
  return c.json({ results: (results as any[]).map((r) => ({ ...r, eligible: !!r.eligible, reasons: r.reasons ? JSON.parse(r.reasons) : [] })) })
})

export default schemes
