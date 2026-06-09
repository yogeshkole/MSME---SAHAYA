-- ============================================================
-- MSME Sahay - Eligibility Finder Enhancements (2026 Update)
-- Extends schemes with detailed eligibility/benefit metadata,
-- adds profile attributes for accurate matching, and a
-- "What's New" scheme_updates changelog table.
-- ============================================================

-- ---- Schemes: richer metadata ----
ALTER TABLE schemes ADD COLUMN abbreviation TEXT;
ALTER TABLE schemes ADD COLUMN objective TEXT;
ALTER TABLE schemes ADD COLUMN benefits TEXT;            -- JSON array of benefit strings
ALTER TABLE schemes ADD COLUMN application_process TEXT; -- step text
ALTER TABLE schemes ADD COLUMN application_link TEXT;
ALTER TABLE schemes ADD COLUMN success_tips TEXT;        -- JSON array
ALTER TABLE schemes ADD COLUMN special_categories TEXT;  -- comma: SC,ST,Women,Rural,NER,BPL,General  (empty = all)
ALTER TABLE schemes ADD COLUMN min_business_age INTEGER DEFAULT 0;  -- years (0 = new allowed)
ALTER TABLE schemes ADD COLUMN max_business_age INTEGER DEFAULT 999;
ALTER TABLE schemes ADD COLUMN eligible_states TEXT;     -- comma list, empty = all India
ALTER TABLE schemes ADD COLUMN max_investment REAL DEFAULT 0;  -- ₹ cap on investment (0 = no cap)
ALTER TABLE schemes ADD COLUMN udyam_required INTEGER DEFAULT 0;
ALTER TABLE schemes ADD COLUMN is_new INTEGER DEFAULT 0; -- highlight in What's New
ALTER TABLE schemes ADD COLUMN launched_on DATE;

-- ---- Profiles: new matching attributes ----
ALTER TABLE profiles ADD COLUMN social_category TEXT DEFAULT 'General'; -- General | SC | ST | OBC
ALTER TABLE profiles ADD COLUMN gender TEXT DEFAULT 'Male';            -- Male | Female | Other
ALTER TABLE profiles ADD COLUMN is_rural INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN investment_amount REAL DEFAULT 0;      -- ₹ in plant & machinery / equipment
ALTER TABLE profiles ADD COLUMN udyam_registered INTEGER DEFAULT 0;

-- ---- What's New / changelog ----
CREATE TABLE IF NOT EXISTS scheme_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheme_code TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  tag TEXT DEFAULT 'new',          -- new | updated | budget | deadline
  source TEXT,
  effective_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_updates_date ON scheme_updates(effective_date);

-- ---- Saved eligibility sessions (persistence + audit of inputs) ----
CREATE TABLE IF NOT EXISTS eligibility_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  inputs TEXT NOT NULL,            -- JSON snapshot of the profile inputs used
  eligible_count INTEGER DEFAULT 0,
  readiness_score INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_elig_sessions_user ON eligibility_sessions(user_id);
