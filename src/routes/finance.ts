import { Hono } from 'hono'
import { authMiddleware, audit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const finance = new Hono<{ Bindings: Bindings; Variables: Variables }>()
finance.use('*', authMiddleware)

// Financial overview: revenue/expense trends, profitability, health score
finance.get('/overview', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM financial_records WHERE user_id = ? ORDER BY period ASC').bind(uid).all()
  const records = results as any[]

  // Pull live transactions so the graph + KPIs reflect anything added via the modal
  const txnRes = await c.env.DB.prepare('SELECT type, category, amount, txn_date FROM transactions WHERE user_id = ?').bind(uid).all()
  const txns = (txnRes.results || []) as any[]

  // Build a per-month map (YYYY-MM) merging financial_records with transactions
  const monthMap: Record<string, { revenue: number; expenses: number }> = {}
  for (const r of records) {
    const period = String(r.period || '').slice(0, 7)
    if (!period) continue
    if (!monthMap[period]) monthMap[period] = { revenue: 0, expenses: 0 }
    monthMap[period].revenue += (r.revenue || 0)
    monthMap[period].expenses += (r.expenses || 0)
  }
  // Category breakdown: seed from latest financial_record, then layer in expense transactions
  let breakdown: Record<string, number> = {}
  if (records.length) {
    const last = records[records.length - 1]
    breakdown = last.category_breakdown ? JSON.parse(last.category_breakdown) : {}
  }
  // Raw expense amounts by category (for accurate live breakdown when transactions exist)
  const expByCat: Record<string, number> = {}
  for (const t of txns) {
    const period = String(t.txn_date || '').slice(0, 7)
    const amt = Number(t.amount) || 0
    if (period) {
      if (!monthMap[period]) monthMap[period] = { revenue: 0, expenses: 0 }
      if (t.type === 'income') monthMap[period].revenue += amt
      else monthMap[period].expenses += amt
    }
    if (t.type === 'expense') {
      const cat = t.category || 'Other'
      expByCat[cat] = (expByCat[cat] || 0) + amt
    }
  }

  const periods = Object.keys(monthMap).sort()

  const totalRevenue = periods.reduce((a, p) => a + monthMap[p].revenue, 0)
  const totalExpenses = periods.reduce((a, p) => a + monthMap[p].expenses, 0)
  const netProfit = totalRevenue - totalExpenses
  const margin = totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0

  // If we have real expense transactions, derive a percentage breakdown from them
  const expTxnTotal = Object.values(expByCat).reduce((a, b) => a + b, 0)
  if (expTxnTotal > 0) {
    const pct: Record<string, number> = {}
    for (const [k, v] of Object.entries(expByCat)) pct[k] = Math.round((v / expTxnTotal) * 100)
    breakdown = pct
  }

  // Health score (0-100): margin (40) + revenue growth (30) + consistency (30)
  let growth = 0
  if (periods.length >= 2) {
    const first = monthMap[periods[0]].revenue || 1
    const last = monthMap[periods[periods.length - 1]].revenue || 0
    growth = Math.round(((last - first) / first) * 100)
  }
  const healthScore = Math.min(100, Math.max(0,
    Math.round((Math.min(margin, 40) / 40) * 40 + (Math.min(Math.max(growth, 0), 60) / 60) * 30 + (periods.length >= 6 ? 30 : periods.length * 5))
  ))

  // Funding readiness
  const fundingReadiness = Math.min(100, Math.round(healthScore * 0.6 + (margin > 15 ? 25 : margin) + (periods.length >= 3 ? 15 : 0)))

  return c.json({
    summary: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin: margin,
      margin: margin,
      revenue_growth: growth,
      health_score: healthScore,
      funding_readiness: fundingReadiness,
      transaction_count: txns.length
    },
    trend: {
      labels: periods,
      revenue: periods.map((p) => monthMap[p].revenue),
      expenses: periods.map((p) => monthMap[p].expenses)
    },
    expense_breakdown: breakdown,
    insights: generateInsights(margin, growth, healthScore)
  })
})

function generateInsights(margin: number, growth: number, health: number): string[] {
  const out: string[] = []
  if (margin > 20) out.push(`Excellent net margin of ${margin}% — strong eligibility for collateral-free loans.`)
  else if (margin > 0) out.push(`Net margin is ${margin}%. Optimize raw-material costs to improve profitability.`)
  else out.push('Operating at a loss — focus on cost control and revenue diversification.')
  if (growth > 0) out.push(`Revenue grew ${growth}% over the period — positive momentum for funding applications.`)
  if (health >= 75) out.push('Business health is strong. You qualify for premium scheme tiers.')
  else out.push('Upload more financial records and file pending returns to boost your health score.')
  return out
}

// Add monthly financial record
finance.post('/records', async (c) => {
  const uid = c.get('userId')
  const { period, revenue, expenses, category_breakdown } = await c.req.json().catch(() => ({}))
  if (!period) return c.json({ error: 'period (YYYY-MM) required' }, 400)
  await c.env.DB.prepare(
    'INSERT INTO financial_records (user_id, period, revenue, expenses, category_breakdown) VALUES (?, ?, ?, ?, ?)'
  ).bind(uid, period, revenue || 0, expenses || 0, JSON.stringify(category_breakdown || {})).run()
  await audit(c, 'add_financial_record', 'finance', period)
  return c.json({ message: 'Financial record added' }, 201)
})

// Transactions
finance.get('/transactions', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY txn_date DESC LIMIT 100').bind(uid).all()
  return c.json({ transactions: results })
})

finance.post('/transactions', async (c) => {
  const uid = c.get('userId')
  const { type, category, amount, description, txn_date } = await c.req.json().catch(() => ({}))
  if (!type || !amount || !txn_date) return c.json({ error: 'type, amount, txn_date required' }, 400)
  const res = await c.env.DB.prepare(
    'INSERT INTO transactions (user_id, type, category, amount, description, txn_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(uid, type, category || null, amount, description || null, txn_date).run()
  return c.json({ id: res.meta.last_row_id, message: 'Transaction recorded' }, 201)
})

export default finance
