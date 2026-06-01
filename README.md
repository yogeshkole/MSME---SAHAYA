# MSME Sahay – AI-Powered MSME Growth Ecosystem

A production-ready, full-stack web application that helps Indian MSMEs discover
government schemes, manage documents/KYC, track finances, and get AI-powered
business guidance. The original frontend was a static mockup — this project adds a
**complete, working backend** and wires the UI to live data.

## Project Overview
- **Name**: MSME Sahay
- **Goal**: Give MSMEs a real, data-driven concierge: authentication, profile/business
  management, document & KYC repository, an intelligent scheme-eligibility engine,
  application workflow, financial intelligence, notifications, an AI assistant, and an
  admin panel.
- **Architecture**: Hono (TypeScript) on Cloudflare Pages/Workers + Cloudflare D1 (SQLite).
  All state is persisted in D1 — nothing is kept in memory or files at runtime.

## ✅ Currently Completed Features
- **Authentication & Authorization**: Email/password, OTP login (mobile/email), Google/
  Facebook OAuth (simulated), JWT access tokens + refresh tokens, sessions/device
  management, login history, RBAC (user/admin). Passwords hashed with PBKDF2 (Web Crypto).
- **Profile Management**: View/edit personal, business, address, GST/PAN/Udyam/Aadhaar
  details; change password; security settings (MFA toggle); login history; active devices.
- **Document Management**: Upload (single + bulk), simulated OCR extraction, versioning,
  duplicate detection, status tracking, delete.
- **KYC Verification**: Aadhaar/PAN/GST/Bank/Face verification with format validation,
  status overview, completion percentage, verification records.
- **Scheme Eligibility Engine**: Rule + score-based matching (size, category, turnover band,
  document readiness), 0–100 scoring, ranking, application-readiness score, persisted results.
- **Application Management**: Draft creation, auto-save, document-validated submission with
  reference numbers, status tracking, resubmission of rejected applications.
- **Financial Dashboard**: Revenue/expense trends, profitability, health score, funding
  readiness score, AI insights, transactions, monthly records.
- **AI Assistant**: Context-aware chatbot that uses the user's real profile, documents,
  eligibility and finances; chat history; recommendations. (Swappable for OpenAI/Gemini.)
- **Notifications**: In-app feed, unread counts, mark read/read-all, delete. Events
  (uploads, submissions, approvals) auto-generate notifications.
- **Admin Panel**: Analytics, user management (suspend/activate), scheme CRUD, application
  review (approve/reject with notifications to user), audit logs, KYC monitor, support tickets.
- **Security**: PBKDF2 hashing, JWT (HS256), rate limiting, CORS, security headers, audit logging.
- **Frontend Integration**: The uploaded SPA is fully wired — login, dashboard KPIs,
  eligibility wizard, documents grid, finance charts, notifications, and AI chat all use the
  live API.

## 🔗 Functional Entry URIs (API)
Base path: `/api`

### Auth (`/api/auth`)
- `POST /register` `{email, password, full_name, phone?}`
- `POST /login` `{email, password}`
- `POST /otp/request` `{identifier}` → returns `dev_otp` (demo)
- `POST /otp/verify` `{identifier, code}`
- `POST /oauth/:provider` (google|facebook)
- `POST /refresh` `{refreshToken}`
- `POST /logout` `{refreshToken}`
- `GET  /me`

### Profile (`/api/profile`) — auth required
- `GET /` · `PUT /` · `POST /change-password` · `POST /settings`
- `GET /login-history` · `GET /devices` · `DELETE /devices/:id`

### Documents (`/api/documents`) — auth required
- `GET /` · `POST /` `{doc_type, file_name, file_size?}` · `POST /bulk` `{files:[]}`
- `GET /:id` · `DELETE /:id`

### KYC (`/api/kyc`) — auth required
- `POST /verify` `{kyc_type, reference_number}` · `GET /status`

### Schemes & Eligibility (`/api/schemes`)
- `GET /` `?category=&search=` (public) · `GET /:id`
- `POST /eligibility/compute` (auth) · `GET /eligibility/results` (auth)

### Applications (`/api/applications`) — auth required
- `GET /` `?status=` · `POST /` `{scheme_id, amount_requested?}` · `PUT /:id` (auto-save)
- `POST /:id/submit` · `POST /:id/resubmit` · `GET /:id`

### Finance (`/api/finance`) — auth required
- `GET /overview` · `POST /records` · `GET /transactions` · `POST /transactions`

### Notifications (`/api/notifications`) — auth required
- `GET /` · `POST /:id/read` · `POST /read-all` · `DELETE /:id`

### AI (`/api/ai`) — auth required
- `POST /chat` `{message}` · `GET /recommendations` · `GET /history`

### Support (`/api/support`) — auth required
- `GET /` · `POST /` `{subject, message?}`

### Admin (`/api/admin`) — admin role required
- `GET /analytics` · `GET /users` · `PUT /users/:id/status`
- `POST /schemes` · `PUT /schemes/:id`
- `GET /applications` · `PUT /applications/:id/review`
- `GET /audit-logs` · `GET /kyc-monitor` · `GET /tickets`

### Health
- `GET /api/health`

## 🔑 Demo Credentials
- **User**: `yogesh@sharma.in` / `Demo@123` (Sharma Manufacturing Co — Micro/Manufacturing)
- **Admin**: `admin@msmesahay.in` / `Admin@123`
- **OTP login**: enter any email/phone; the demo OTP is returned in the response and auto-filled.

## Data Architecture
- **Storage**: Cloudflare D1 (SQLite). Local dev uses `--local` SQLite in `.wrangler/`.
- **Tables**: `users`, `profiles`, `sessions`, `otp_codes`, `login_history`, `documents`,
  `verification_records`, `schemes`, `eligibility_results`, `applications`,
  `financial_records`, `transactions`, `notifications`, `support_tickets`,
  `ai_recommendations`, `audit_logs`.
- **Data flow**: Frontend (public/index.html + static/api.js + static/integration.js) →
  `/api/*` Hono routes → D1 queries → JSON responses rendered into the SPA.

## User Guide
1. Open the app — you land on the login page (demo credentials pre-filled).
2. **Sign In** (or use OTP / Google / Facebook / Sign up) to enter the dashboard.
3. **Dashboard** shows live health score, eligible schemes, active applications, verified docs, cash flow.
4. **Scheme Eligibility** → click "Find Schemes" to run the engine; schemes are ranked by AI match score.
5. **Documents** → "Upload Document" to add docs (OCR extracts fields; eligibility updates).
6. **Finance** → live revenue/expense charts and AI insights from your records.
7. **Notifications** → live feed; click to mark read.
8. **AI Assistant** (chat widget) → ask about schemes, documents, or finances — it answers using your real data.

## Tech Stack
- **Backend**: Hono 4 (TypeScript), Cloudflare Workers runtime
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: JWT (HS256) + PBKDF2 password hashing via Web Crypto API
- **Build**: Vite + @hono/vite-build (Cloudflare Pages)
- **Frontend**: Vanilla JS SPA + Chart.js + TailwindCDN/FontAwesome (from the uploaded design)

## Local Development
```bash
npm install
npm run db:migrate:local   # apply schema to local D1
npm run db:seed            # load demo data
npm run build              # vite build + custom _routes.json
pm2 start ecosystem.config.cjs   # serves on http://localhost:3000
```
Reset DB anytime: `npm run db:reset`

## ❌ Features Not Yet Implemented (and notes)
- **Real file bytes / cloud storage**: Document uploads store metadata + simulated OCR.
  For real binary storage, add a Cloudflare **R2** bucket and stream file bodies.
- **Real KYC/OCR providers**: KYC uses format validation and OCR is simulated. Plug in
  UIDAI/NSDL/GST APIs and an OCR service (server-side fetch) for production.
- **Real LLM**: AI assistant is a deterministic, context-aware engine. Swap in OpenAI/Gemini
  by calling their REST API from `src/routes/ai.ts` (store the key as a Cloudflare secret).
- **Real email/SMS/WhatsApp/push delivery**: Notifications are in-app; OTP is returned in the
  response for the demo. Integrate SendGrid/Twilio/etc. via server-side fetch.
- **WebSockets / real-time push**: Not supported on Pages; use polling or Durable Objects.

## Recommended Next Steps
1. Add an **R2 bucket** and real multipart file upload for documents.
2. Integrate a real **LLM** (OpenAI/Gemini) and **OCR** provider via secrets.
3. Wire **SendGrid/Twilio** for email/SMS OTP and notification delivery.
4. Build out the **admin UI** screens (APIs already exist).
5. Deploy to Cloudflare Pages and create the production D1 database + migrations.

## Deployment
- **Platform**: Cloudflare Pages (Workers runtime)
- **Status**: ✅ Running locally via PM2 (sandbox). Not yet deployed to production.
- **Last Updated**: 2026-06-01
