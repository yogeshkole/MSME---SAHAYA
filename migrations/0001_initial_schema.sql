-- ============================================================
-- MSME Sahay - Initial Schema
-- ============================================================

-- Users (auth)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT,
  password_salt TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',          -- user | admin
  status TEXT NOT NULL DEFAULT 'active',        -- active | suspended
  oauth_provider TEXT,                          -- google | facebook | NULL
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Profiles (personal + business info)
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  avatar_url TEXT,
  designation TEXT,
  business_name TEXT,
  business_category TEXT,         -- Manufacturing | Services | Trading | ...
  business_size TEXT,             -- Micro | Small | Medium
  gst_number TEXT,
  pan_number TEXT,
  udyam_number TEXT,
  aadhaar_masked TEXT,
  annual_turnover REAL DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  year_established INTEGER,
  address_line TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- Sessions / refresh tokens
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  refresh_token TEXT NOT NULL,
  device TEXT,
  ip_address TEXT,
  expires_at DATETIME NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- OTP codes (mobile/email)
CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,        -- email or phone
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',  -- login | verify | reset
  expires_at DATETIME NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_codes(identifier);

-- Login history
CREATE TABLE IF NOT EXISTS login_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  method TEXT,                     -- password | otp | google | facebook
  ip_address TEXT,
  device TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL,          -- aadhaar | pan | gst | udyam | bank_statement | ...
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',  -- uploaded | verified | rejected | expired
  version INTEGER NOT NULL DEFAULT 1,
  ocr_data TEXT,                   -- JSON extracted fields
  expiry_date DATE,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

-- KYC verification records
CREATE TABLE IF NOT EXISTS verification_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kyc_type TEXT NOT NULL,          -- aadhaar | pan | gst | bank | face
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | verified | failed
  result_data TEXT,                -- JSON
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_verif_user ON verification_records(user_id);

-- Schemes (catalog)
CREATE TABLE IF NOT EXISTS schemes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ministry TEXT,
  category TEXT,                   -- Loan | Subsidy | Credit Guarantee | Grant
  description TEXT,
  max_benefit REAL,
  subsidy_pct REAL,
  interest_rate REAL,
  eligible_size TEXT,              -- comma list: Micro,Small,Medium
  eligible_category TEXT,          -- comma list: Manufacturing,Services,Trading
  min_turnover REAL DEFAULT 0,
  max_turnover REAL DEFAULT 999999999,
  required_docs TEXT,              -- comma list of doc_types
  deadline DATE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Eligibility results (computed matches per user)
CREATE TABLE IF NOT EXISTS eligibility_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scheme_id INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,   -- 0-100
  eligible INTEGER NOT NULL DEFAULT 0,
  reasons TEXT,                       -- JSON array
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (scheme_id) REFERENCES schemes(id)
);
CREATE INDEX IF NOT EXISTS idx_elig_user ON eligibility_results(user_id);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scheme_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | submitted | under_review | approved | rejected
  amount_requested REAL DEFAULT 0,
  form_data TEXT,                  -- JSON auto-saved form
  review_notes TEXT,
  rejection_reason TEXT,
  reference_no TEXT,
  submitted_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (scheme_id) REFERENCES schemes(id)
);
CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);

-- Financial records (monthly revenue/expense)
CREATE TABLE IF NOT EXISTS financial_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  period TEXT NOT NULL,            -- YYYY-MM
  revenue REAL DEFAULT 0,
  expenses REAL DEFAULT 0,
  category_breakdown TEXT,         -- JSON {raw_materials, salaries, ...}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_fin_user ON financial_records(user_id);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,              -- income | expense
  category TEXT,
  amount REAL NOT NULL,
  description TEXT,
  txn_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',        -- info | success | warning | alert
  channel TEXT DEFAULT 'in_app',   -- in_app | email | sms | push
  read INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- open | in_progress | resolved | closed
  priority TEXT DEFAULT 'normal',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AI recommendations / chat history
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT DEFAULT 'chat',        -- chat | scheme | financial
  prompt TEXT,
  response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  detail TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
