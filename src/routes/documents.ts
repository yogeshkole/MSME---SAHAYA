import { Hono } from 'hono'
import { authMiddleware, audit } from '../lib/middleware'
import type { Bindings, Variables } from '../lib/types'

const docs = new Hono<{ Bindings: Bindings; Variables: Variables }>()
docs.use('*', authMiddleware)

const DOC_TYPES = ['aadhaar', 'pan', 'gst', 'udyam', 'bank_statement', 'financial_report', 'business_license', 'income_tax', 'loan_document', 'scheme_document']

// Simulated OCR extraction by doc type
function simulateOCR(docType: string, fileName: string) {
  const samples: Record<string, any> = {
    aadhaar: { name: 'Yogesh Sharma', aadhaar: 'XXXX XXXX 4521', dob: '1988-06-12' },
    pan: { name: 'YOGESH SHARMA', pan: 'ABCPS1234K' },
    gst: { gstin: '27ABCPS1234K1Z5', legal_name: 'Sharma Manufacturing Co' },
    udyam: { udyam: 'UDYAM-MH-26-0012345', enterprise: 'Sharma Manufacturing Co', type: 'Micro' },
    bank_statement: { account: 'XXXX1234', bank: 'SBI', closing_balance: 245000 },
  }
  return { extracted: samples[docType] || { note: 'No structured fields extracted', file: fileName }, confidence: 0.94 }
}

// List documents
docs.get('/', async (c) => {
  const uid = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC').bind(uid).all()
  return c.json({ documents: results.map((d: any) => ({ ...d, ocr_data: d.ocr_data ? JSON.parse(d.ocr_data) : null })) })
})

// Upload document (metadata + simulated OCR). File bytes would go to R2 in prod.
docs.post('/', async (c) => {
  const uid = c.get('userId')
  const b = await c.req.json().catch(() => ({}))
  const { doc_type, file_name, file_size, mime_type } = b
  if (!doc_type || !file_name) return c.json({ error: 'doc_type and file_name required' }, 400)
  if (!DOC_TYPES.includes(doc_type)) return c.json({ error: 'Invalid doc_type', allowed: DOC_TYPES }, 400)

  // Duplicate detection
  const dup: any = await c.env.DB.prepare('SELECT id, version FROM documents WHERE user_id = ? AND doc_type = ? ORDER BY version DESC LIMIT 1').bind(uid, doc_type).first()
  const version = dup ? dup.version + 1 : 1

  const ocr = simulateOCR(doc_type, file_name)
  const res = await c.env.DB.prepare(
    'INSERT INTO documents (user_id, doc_type, file_name, file_size, mime_type, status, version, ocr_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(uid, doc_type, file_name, file_size || 0, mime_type || 'application/octet-stream', 'uploaded', version, JSON.stringify(ocr)).run()

  await c.env.DB.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .bind(uid, 'Document uploaded', `${doc_type.toUpperCase()} uploaded successfully and queued for verification.`, 'success').run()
  await audit(c, 'upload_document', 'document', doc_type)

  return c.json({
    message: 'Document uploaded',
    id: res.meta.last_row_id,
    doc_type, version,
    ocr_result: ocr,
    duplicate: !!dup
  }, 201)
})

// Bulk upload
docs.post('/bulk', async (c) => {
  const uid = c.get('userId')
  const { files } = await c.req.json().catch(() => ({}))
  if (!Array.isArray(files)) return c.json({ error: 'files array required' }, 400)
  const inserted: any[] = []
  for (const f of files) {
    if (!f.doc_type || !f.file_name || !DOC_TYPES.includes(f.doc_type)) continue
    const ocr = simulateOCR(f.doc_type, f.file_name)
    const res = await c.env.DB.prepare(
      'INSERT INTO documents (user_id, doc_type, file_name, file_size, status, ocr_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(uid, f.doc_type, f.file_name, f.file_size || 0, 'uploaded', JSON.stringify(ocr)).run()
    inserted.push({ id: res.meta.last_row_id, doc_type: f.doc_type })
  }
  await audit(c, 'bulk_upload', 'document', `${inserted.length} files`)
  return c.json({ message: `${inserted.length} documents uploaded`, inserted }, 201)
})

// Get one (with versions)
docs.get('/:id', async (c) => {
  const uid = c.get('userId')
  const doc: any = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).first()
  if (!doc) return c.json({ error: 'Not found' }, 404)
  doc.ocr_data = doc.ocr_data ? JSON.parse(doc.ocr_data) : null
  return c.json({ document: doc })
})

// Delete
docs.delete('/:id', async (c) => {
  const uid = c.get('userId')
  await c.env.DB.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').bind(c.req.param('id'), uid).run()
  await audit(c, 'delete_document', 'document', c.req.param('id'))
  return c.json({ message: 'Document deleted' })
})

export default docs
