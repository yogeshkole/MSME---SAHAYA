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

  const totalRevenue = records.reduce((a, r) => a + (r.revenue || 0), 0)
  const totalExpenses = records.reduce((a, r) => a + (r.expenses || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const margin = totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0

  // Latest month category breakdown
  let breakdown: Record<string, number> = {}
  if (records.length) {
    const last = records[records.length - 1]
    breakdown = last.category_breakdown ? JSON.parse(last.category_breakdown) : {}
  }

  // Health score (0-100): margin (40) + revenue growth (30) + consistency (30)
  let growth = 0
  if (records.length >= 2) {
    const first = records[0].revenue || 1
    const last = records[records.length - 1].revenue || 0
    growth = Math.round(((last - first) / first) * 100)
  }
  const healthScore = Math.min(100, Math.max(0,
    Math.round((Math.min(margin, 40) / 40) * 40 + (Math.min(Math.max(growth, 0), 60) / 60) * 30 + (records.length >= 6 ? 30 : records.length * 5))
  ))

  // Funding readiness
  const fundingReadiness = Math.min(100, Math.round(healthScore * 0.6 + (margin > 15 ? 25 : margin) + (records.length >= 3 ? 15 : 0)))

  return c.json({
    summary: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin: margin,
      revenue_growth: growth,
      health_score: healthScore,
      funding_readiness: fundingReadiness
    },
    trend: {
      labels: records.map((r) => r.period),
      revenue: records.map((r) => r.revenue || 0),
      expenses: records.map((r) => r.expenses || 0)
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
