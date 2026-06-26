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
- **Scheme Eligibility Engine (Enhanced 2026)**: Dynamic rule-based + weighted scoring engine
  that cross-references **investment, turnover, sector, state, social category (SC/ST/OBC),
  gender (women-owned), rural status, business age, Udyam registration and document readiness**
  against the latest Govt of India criteria. Implements the **revised 2026 MSME classification**
  (both investment AND turnover conditions). Produces transparent `reasons[]` (why you qualify)
  and `blockers[]` (why you don't), a 0–100 match score, MSME classification, and an
  application-readiness score. Results + each search session are persisted. Catalogue holds
  **17 official schemes** incl. the new 2025-26 launches (SME Growth Fund ₹10,000 Cr, MSE GIFT,
  MSE SPICE, MSME TEAM, TREAD for women) with full benefits, required documents, application
  process, official portal links, deadlines and success tips. A **"What's New"** changelog
  surfaces budget updates and new scheme launches.
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
- `GET /` `?category=&search=&new=1` (public) — scheme catalogue; `new=1` filters 2025-26 launches
- `GET /:id` (public) — full scheme detail (benefits, docs, process, link, tips)
- `GET /whats-new` (public) — "What's New" changelog (budget updates, new schemes)
- `POST /classify` `{investment, turnover}` (public) — live 2026 MSME classification (Micro/Small/Medium)
- `POST /eligibility/compute` (auth) — body accepts overrides:
  `{sector, investment, turnover, social_category, gender, is_rural, state, business_age, udyam_registered, save?}`
  Returns `{classification, eligible_count, readiness_score, results:[{score, eligible, reasons[], blockers[],
  benefits[], required_docs[], application_process, application_link, deadline, success_tips[], is_new}]}`
- `GET /eligibility/results` (auth) — last computed results
- `GET /eligibility/sessions` (auth) — eligibility search history

#### 2026 MSME Classification (both conditions apply)
| Category | Investment | Annual Turnover |
|----------|-----------|-----------------|
| Micro    | ≤ ₹2.5 cr | ≤ ₹10 cr        |
| Small    | ≤ ₹25 cr  | ≤ ₹100 cr       |
| Medium   | ≤ ₹125 cr | ≤ ₹500 cr       |

#### Sample eligibility results (verified)
- **Example 1** — New Manufacturing unit, Karnataka, Investment ₹1.8 cr / Turnover ₹7 cr, General →
  **Micro**, 8 eligible: CGTMSE, ZED, MSME-INNOVATIVE, RAMP, PMEGP, MSE-CDP, MSE-GIFT, MSE-SPICE.
- **Example 2** — Women-owned Service, rural Karnataka, Investment ₹80 lakh / Turnover ₹4 cr →
  **Micro**, 9 eligible with women-specific **MSME-TEAM (100)** and **TREAD (100)** ranked top,
  followed by CGTMSE, PMEGP, CGSSD, MSE-CDP.

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
4. **Scheme Eligibility** → review the **What's New** panel, fill the 3-step wizard (business type,
   social category, gender, rural status, state, business age, investment, turnover, Udyam status —
   with a **live MSME classification** badge), then click "Find Schemes". Each result shows
   eligible/not-eligible status, match score, the exact reasons you qualify (or the blockers), and an
   expandable panel with benefits, required documents, how-to-apply steps, deadline, success tips,
   and a link to the official application portal.
5. **Documents** → "Upload Document" to add docs (OCR extracts fields; eligibility updates).
6. **Finance** → live KPIs (income, expenses, net profit, health score), revenue/expense charts, and a
   transactions ledger. Click **"Add Transaction"** to record income/expenses (type, amount, date,
   category, description) — saved to the backend and **instantly merged into the KPIs, the
   month-by-month trend graph, and the expense-breakdown donut**. **"Export"** downloads all
   transactions as CSV.
7. **Profile** → view your live business profile. Click **"Edit Profile"** (or any card's "Edit") to
   open a form and update name, contact, business details, financials, Udyam/GST/PAN, and address —
   saved via `PUT /api/profile` and reflected immediately across the profile and sidebar.
8. **Branch Locator** → find MSME support offices across India. A **6-column stat strip** shows
   Total Branches (28), States Covered (18), Dev. Institutes (17), Tech Centres (7), Facilitation
   Offices (4), and Schemes Supported (50+). Use the **topbar search** (name/state/address/service),
   **type pills** (All Types / Development Institute / Facilitation Office / Technology Centre), and a
   **State dropdown** to filter; a live result count and **Clear** button appear when filters are active.
   A **two-column layout** shows a live Google Maps panel + selected-branch detail card on the left
   (with Get Directions / Book Appointment / Call Branch actions) and a scrollable branch list on the
   right. Click any card to select it — the map remounts to that location and the detail card updates;
   the selected card gets a gold accent and expanded service chips. **Export List** downloads all 28
   branches as CSV. Covers 28 real offices including MSME-DI Hyderabad ⭐4.3, MSME-DI Kalaburagi ⭐4.8,
   MSME-DFO Mumbai ⭐4.0, MSME-DFO Coimbatore ⭐4.9, MSME-TC Bengaluru ⭐4.3, and more across 18 states.
9. **Notifications** → live feed; click to mark read.
10. **AI Assistant** (chat widget) → ask about schemes, documents, or finances — it answers using your real data.

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

## Design — Van Gogh Theme
The SPA uses a Van Gogh-inspired visual system applied via CSS custom-property remapping
(variable names preserved, values changed) in `public/index.html`:
- **Starry Night** deep blues (`#0B2C5E`, royal `#1A3A7A`) for the login hero and headers.
- **Sunflower gold** (`#FFCC00` / `#F5B800`) and **warm orange glow** (`#FF9F1C`, wheat `#E07A00`) for CTAs.
- **Cypress-olive green** (`#1E6B4E`), **crimson** (`#C8102E`), **iris violet** (`#6A4E9C`) accents.
- **Warm cream/wheat** backgrounds (`#F5E8C7`, card `#FFFBF0`, moonlit `#EDE4D5`) with subtle swirl texture.
- Glowing sunflower CTAs (`vg-glow`), twinkling stars (`vg-twinkle`), swirl-in animations (`vg-swirl-in`),
  brush-stroke wizard connectors, impasto card depth, and Van-Gogh-tinted Chart.js graphs.
- Dashboard greeting: "let your business shine like the stars ✨".

### 🌌 Night Mode (Starry Night cosmic theme)
A premium dark theme toggled from the **moon/sun button in the top navbar** (top-right) and
**persisted** in `localStorage` (`msme_theme`), applied pre-paint to avoid any flash:
- **Cosmic navy-indigo sky** background inspired by Van Gogh's *Starry Night* — layered radial/conic
  gradients (glowing moon + twilight glow + swirl), a twinkling **starfield overlay**, and a slow
  **drifting swirl layer** for cinematic depth.
- **Glassmorphic surfaces** — frosted `backdrop-filter` blur on the topbar, cards, KPI tiles, branch
  panels, modals and the login card, with **electric-blue glowing borders on hover**.
- Design tokens re-mapped on `body.night-mode` (cool luminous text, electric-blue `#5b8cff` accents,
  warm gold that glows against the dark sky) — fully cohesive with the existing blue glassmorphism.
- **Chart.js graphs auto-retint** (axes/legend/grid) when the theme switches; smooth 0.45s cross-fade
  transitions; respects `prefers-reduced-motion`.

## Deployment
- **Platform**: Cloudflare Pages (Workers runtime)
- **Status**: ✅ Running locally via PM2 (sandbox). Not yet deployed to production.
- **Last Updated**: 2026-06-16
