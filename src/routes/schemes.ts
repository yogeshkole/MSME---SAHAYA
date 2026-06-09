import { Hono } from 'hono'
import { authMiddleware, audit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const schemes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ============================================================
// 2026 MSME Classification (both investment AND turnover apply)
// Micro:  Investment <= 2.5 Cr  AND  Turnover <= 10 Cr
// Small:  Investment <= 25 Cr   AND  Turnover <= 100 Cr
// Medium: Investment <= 125 Cr  AND  Turnover <= 500 Cr
// ============================================================
const CR = 10000000
export function classifyMSME(investment: number, turnover: number): string | null {
  if (investment <= 2.5 * CR && turnover <= 10 * CR) return 'Micro'
  if (investment <= 25 * CR && turnover <= 100 * CR) return 'Small'
  if (investment <= 125 * CR && turnover <= 500 * CR) return 'Medium'
  return null // exceeds MSME limits
}

function parseList(s: string | null): string[] {
  return (s || '').split(',').map((x) => x.trim()).filter(Boolean)
}

// Normalize a business sector/category so the wizard's friendly labels
// (e.g. "Service", "IT / Technology", "Agro-based") match the scheme
// catalogue's canonical values (Manufacturing / Services / Trading).
function canonicalSector(raw: any): string {
  const s = String(raw || '').toLowerCase().trim()
  if (!s) return ''
  if (s.startsWith('manufactur') || s.indexOf('agro') >= 0 || s.indexOf('production') >= 0) return 'Manufacturing'
  if (s.startsWith('trad') || s.indexOf('retail') >= 0 || s.indexOf('wholesale') >= 0) return 'Trading'
  // Services, Service, IT/Technology, software, consulting, etc.
  return 'Services'
}
function safeJSON(s: any, fallback: any) {
  try { return s ? JSON.parse(s) : fallback } catch { return fallback }
}

// Enrich a scheme row into the API shape (parse JSON columns)
function enrichScheme(s: any) {
  return {
    ...s,
    benefits: safeJSON(s.benefits, []),
    success_tips: safeJSON(s.success_tips, []),
    required_docs_list: parseList(s.required_docs),
    special_categories_list: parseList(s.special_categories),
    eligible_size_list: parseList(s.eligible_size),
    eligible_category_list: parseList(s.eligible_category),
  }
}

// ---------------- Public catalogue ----------------
schemes.get('/', async (c) => {
  const category = c.req.query('category')
  const search = c.req.query('search')
  const isNew = c.req.query('new')
  let sql = 'SELECT * FROM schemes WHERE active = 1'
  const binds: any[] = []
  if (category) { sql += ' AND category = ?'; binds.push(category) }
  if (isNew === '1') { sql += ' AND is_new = 1' }
  if (search) { sql += ' AND (name LIKE ? OR description LIKE ? OR abbreviation LIKE ?)'; binds.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  sql += ' ORDER BY is_new DESC, max_benefit DESC'
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ schemes: (results as any[]).map(enrichScheme) })
})

// "What's New" changelog
schemes.get('/whats-new', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM scheme_updates ORDER BY effective_date DESC, id DESC LIMIT 30'
  ).all()
  return c.json({ updates: results })
})

// MSME classification helper (for the wizard)
schemes.post('/classify', async (c) => {
  const { investment, turnover } = await c.req.json().catch(() => ({}))
  const cls = classifyMSME(Number(investment) || 0, Number(turnover) || 0)
  return c.json({
    classification: cls,
    eligible_as_msme: cls !== null,
    rule: 'Micro: Inv ≤₹2.5cr & TO ≤₹10cr | Small: Inv ≤₹25cr & TO ≤₹100cr | Medium: Inv ≤₹125cr & TO ≤₹500cr'
  })
})

schemes.get('/:id', async (c) => {
  const s = await c.env.DB.prepare('SELECT * FROM schemes WHERE id = ?').bind(c.req.param('id')).first()
  if (!s) return c.json({ error: 'Not found' }, 404)
  return c.json({ scheme: enrichScheme(s) })
})

// ============================================================
// Eligibility Engine — rule-based gating + weighted scoring with
// transparent qualify / disqualify explanations.
// Accepts optional input overrides (else uses saved profile).
// ============================================================
function evaluate(scheme: any, p: any, ownedDocs: Set<string>) {
  const reasons: string[] = []        // positive
  const blockers: string[] = []       // hard disqualifiers
  let score = 0

  // --- Hard gate 1: MSME classification valid ---
  const cls = classifyMSME(p.investment_amount || 0, p.annual_turnover || 0)
  if (!cls) blockers.push('Enterprise exceeds MSME investment/turnover limits (not an MSME)')

  // --- Gate 2: size match (weight 22) ---
  const sizes = parseList(scheme.eligible_size)
  if (sizes.length && cls && !sizes.includes(cls)) {
    blockers.push(`Scheme is for ${sizes.join('/')} enterprises; you are ${cls}`)
  } else if (cls) {
    score += 22; reasons.push(`Enterprise size '${cls}' is eligible`)
  }

  // --- Gate 3: sector / category (weight 18) ---
  const cats = parseList(scheme.eligible_category).map(canonicalSector)
  const userSector = canonicalSector(p.business_category)
  if (cats.length && userSector && !cats.includes(userSector)) {
    blockers.push(`Requires sector: ${parseList(scheme.eligible_category).join('/')}; yours is ${p.business_category}`)
  } else { score += 18; reasons.push(`Sector '${p.business_category || userSector}' qualifies`) }

  // --- Gate 4: special category (SC/ST/Women/Rural) (weight 15) ---
  const special = parseList(scheme.special_categories)
  if (special.length) {
    const userFlags: string[] = []
    if (p.social_category === 'SC') userFlags.push('SC')
    if (p.social_category === 'ST') userFlags.push('ST')
    if (p.gender === 'Female') userFlags.push('Women')
    if (p.is_rural) userFlags.push('Rural')
    const match = special.some((s) => userFlags.includes(s) || s === 'General')
    if (!match) {
      blockers.push(`Reserved for ${special.join('/')} category applicants`)
    } else {
      score += 15; reasons.push(`Qualifies under special category: ${special.filter((s) => userFlags.includes(s)).join(', ') || 'General'}`)
    }
  } else {
    score += 8; reasons.push('Open to all categories')
  }

  // --- Gate 5: turnover band (weight 12) ---
  const to = p.annual_turnover || 0
  if (to < (scheme.min_turnover || 0) || to > (scheme.max_turnover || 9e15)) {
    blockers.push('Annual turnover is outside the eligible band')
  } else { score += 12; reasons.push('Turnover within eligible band') }

  // --- Gate 6: investment cap (weight 5) ---
  if (scheme.max_investment && (p.investment_amount || 0) > scheme.max_investment) {
    blockers.push('Investment exceeds the scheme cap')
  } else { score += 5 }

  // --- Gate 7: business age (weight 8) ---
  // Prefer an explicit business_age input; else derive from year_established.
  const age = (p.business_age !== undefined && p.business_age !== null && p.business_age !== '')
    ? Number(p.business_age)
    : (p.year_established ? (new Date().getFullYear() - p.year_established) : 0)
  if (age < (scheme.min_business_age || 0)) {
    blockers.push(`Business must be at least ${scheme.min_business_age} year(s) old (yours: ${age})`)
  } else if (age > (scheme.max_business_age || 999)) {
    blockers.push('Business age exceeds the scheme limit')
  } else { score += 8; reasons.push(`Business age ${age}y is within range`) }

  // --- Gate 8: state restriction (weight 3) ---
  const states = parseList(scheme.eligible_states)
  if (states.length && p.state && !states.includes(p.state)) {
    blockers.push(`Available only in: ${states.join(', ')}`)
  } else { score += 3 }

  // --- Soft: Udyam registration (weight 5) ---
  if (scheme.udyam_required) {
    if (p.udyam_registered) { score += 5; reasons.push('Udyam registration on file') }
    else reasons.push('⚠ Udyam registration required — register at udyamregistration.gov.in')
  } else { score += 5 }

  // --- Soft: document readiness (weight 12) ---
  const reqDocs = parseList(scheme.required_docs)
  if (reqDocs.length === 0) { score += 12 }
  else {
    const have = reqDocs.filter((d) => ownedDocs.has(d))
    score += Math.round((have.length / reqDocs.length) * 12)
    if (have.length < reqDocs.length) reasons.push(`Missing documents: ${reqDocs.filter((d) => !ownedDocs.has(d)).join(', ')}`)
    else reasons.push('All required documents uploaded')
  }

  const eligible = blockers.length === 0 && score >= 60
  // If hard-blocked, cap the score so it ranks below borderline matches
  if (blockers.length) score = Math.min(score, 45)

  return { score: Math.max(0, Math.min(100, score)), eligible, reasons, blockers }
}

// Compute eligibility (optionally override profile inputs via body)
schemes.post('/eligibility/compute', authMiddleware, async (c) => {
  const uid = c.get('userId')
  const overrides = await c.req.json().catch(() => ({}))

  const baseProf: any = await c.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(uid).first()
  if (!baseProf) return c.json({ error: 'Complete your profile first' }, 400)

  // Normalize incoming aliases so the wizard can use friendly field names.
  const norm: any = { ...overrides }
  if (norm.sector !== undefined && norm.business_category === undefined) norm.business_category = norm.sector
  if (norm.investment !== undefined && norm.investment_amount === undefined) norm.investment_amount = Number(norm.investment)
  if (norm.turnover !== undefined && norm.annual_turnover === undefined) norm.annual_turnover = Number(norm.turnover)
  if (norm.investment_amount !== undefined) norm.investment_amount = Number(norm.investment_amount)
  if (norm.annual_turnover !== undefined) norm.annual_turnover = Number(norm.annual_turnover)
  if (norm.is_rural !== undefined) norm.is_rural = (norm.is_rural === true || norm.is_rural === 1 || norm.is_rural === '1') ? 1 : 0
  if (norm.udyam_registered !== undefined) norm.udyam_registered = (norm.udyam_registered === true || norm.udyam_registered === 1 || norm.udyam_registered === '1') ? 1 : 0

  // Merge overrides (instant search without saving)
  const p = { ...baseProf, ...norm }
  // Persist overrides to profile when explicitly asked
  if (overrides.save) {
    // Convert business_age -> year_established for storage
    if (norm.business_age !== undefined && norm.year_established === undefined) {
      norm.year_established = new Date().getFullYear() - Number(norm.business_age)
    }
    const fields = ['business_category', 'business_size', 'annual_turnover', 'investment_amount', 'social_category', 'gender', 'is_rural', 'year_established', 'state', 'udyam_registered']
    const sets: string[] = []; const vals: any[] = []
    for (const f of fields) if (norm[f] !== undefined) { sets.push(`${f} = ?`); vals.push(norm[f]) }
    if (sets.length) { vals.push(uid); await c.env.DB.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`).bind(...vals).run() }
  }

  const docs = await c.env.DB.prepare('SELECT DISTINCT doc_type FROM documents WHERE user_id = ?').bind(uid).all()
  const ownedDocs = new Set((docs.results as any[]).map((d) => d.doc_type))

  const { results: allSchemes } = await c.env.DB.prepare('SELECT * FROM schemes WHERE active = 1').all()
  const classification = classifyMSME(p.investment_amount || 0, p.annual_turnover || 0)

  await c.env.DB.prepare('DELETE FROM eligibility_results WHERE user_id = ?').bind(uid).run()
  const computed: any[] = []

  for (const s of allSchemes as any[]) {
    const ev = evaluate(s, p, ownedDocs)
    await c.env.DB.prepare(
      'INSERT INTO eligibility_results (user_id, scheme_id, score, eligible, reasons) VALUES (?, ?, ?, ?, ?)'
    ).bind(uid, s.id, ev.score, ev.eligible ? 1 : 0, JSON.stringify({ reasons: ev.reasons, blockers: ev.blockers })).run()
    computed.push({
      scheme_id: s.id, name: s.name, code: s.code, abbreviation: s.abbreviation, category: s.category,
      ministry: s.ministry, max_benefit: s.max_benefit, subsidy_pct: s.subsidy_pct, deadline: s.deadline,
      is_new: !!s.is_new, application_link: s.application_link,
      benefits: safeJSON(s.benefits, []), success_tips: safeJSON(s.success_tips, []),
      required_docs: parseList(s.required_docs), application_process: s.application_process,
      score: ev.score, eligible: ev.eligible, reasons: ev.reasons, blockers: ev.blockers
    })
  }

  computed.sort((a, b) => (b.eligible === a.eligible ? b.score - a.score : (b.eligible ? 1 : -1)))
  const eligibleCount = computed.filter((x) => x.eligible).length
  const readiness = Math.round(computed.reduce((a, b) => a + b.score, 0) / (computed.length || 1))

  // Persist session
  await c.env.DB.prepare('INSERT INTO eligibility_sessions (user_id, inputs, eligible_count, readiness_score) VALUES (?, ?, ?, ?)')
    .bind(uid, JSON.stringify({ classification, business_category: p.business_category, annual_turnover: p.annual_turnover, investment_amount: p.investment_amount, social_category: p.social_category, gender: p.gender, is_rural: p.is_rural }), eligibleCount, readiness).run()

  await audit(c, 'compute_eligibility', 'scheme', `${computed.length} schemes, ${eligibleCount} eligible`)
  return c.json({
    classification,
    classification_note: classification ? `Your enterprise is classified as ${classification}` : 'Enterprise exceeds MSME limits',
    total: computed.length,
    eligible_count: eligibleCount,
    readiness_score: readiness,
    results: computed
  })
})

// Saved results
schemes.get('/eligibility/results', authMiddleware, async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare(`
    SELECT e.*, s.name, s.code, s.abbreviation, s.category, s.max_benefit, s.subsidy_pct, s.deadline, s.ministry,
           s.description, s.benefits, s.success_tips, s.application_link, s.application_process, s.required_docs, s.is_new
    FROM eligibility_results e JOIN schemes s ON s.id = e.scheme_id
    WHERE e.user_id = ? ORDER BY e.eligible DESC, e.score DESC
  `).bind(uid).all()
  return c.json({
    results: (results as any[]).map((r) => {
      const parsed = safeJSON(r.reasons, { reasons: [], blockers: [] })
      return {
        ...r, eligible: !!r.eligible, is_new: !!r.is_new,
        reasons: parsed.reasons || [], blockers: parsed.blockers || [],
        benefits: safeJSON(r.benefits, []), success_tips: safeJSON(r.success_tips, []),
        required_docs: parseList(r.required_docs)
      }
    })
  })
})

// Eligibility session history
schemes.get('/eligibility/sessions', authMiddleware, async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM eligibility_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').bind(uid).all()
  return c.json({ sessions: (results as any[]).map((s) => ({ ...s, inputs: safeJSON(s.inputs, {}) })) })
})

export default schemes
