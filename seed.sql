-- ============================================================
-- MSME Sahay - Seed Data
-- Demo password: Demo@123  |  Admin password: Admin@123
-- ============================================================

-- Users
INSERT OR IGNORE INTO users (id, email, phone, password_hash, password_salt, full_name, role, status, email_verified, phone_verified) VALUES
 (1, 'yogesh@sharma.in', '+919876543210', '5ac8ed405fa5f33346c1f096ca72d98dd680d8649d860ad2b976ebc162b08faf', 'ade5064009aa6fc89ad07a1d6feaaed1', 'Yogesh Sharma', 'user', 'active', 1, 1),
 (2, 'admin@msmesahay.in', '+919999900000', '86f01076f2613231cf3685340bb4678e6ac8a6047a5d2041110148120f43a10f', 'c54f11f58ef0292884b6563e18bd597b', 'Platform Admin', 'admin', 'active', 1, 1);

-- Profiles (with 2026 eligibility attributes: social_category, gender, is_rural, investment_amount, udyam_registered)
INSERT OR IGNORE INTO profiles (user_id, designation, business_name, business_category, business_size, gst_number, pan_number, udyam_number, aadhaar_masked, annual_turnover, employee_count, year_established, address_line, city, state, pincode, social_category, gender, is_rural, investment_amount, udyam_registered) VALUES
 (1, 'Founder & CEO', 'Sharma Manufacturing Co', 'Manufacturing', 'Micro', '27ABCPS1234K1Z5', 'ABCPS1234K', 'UDYAM-MH-26-0012345', 'XXXX XXXX 4521', 8400000, 12, 2019, 'Plot 24, MIDC Industrial Area', 'Pune', 'Maharashtra', '411019', 'General', 'Male', 0, 18000000, 1),
 (2, 'Administrator', 'MSME Sahay Platform', 'Services', 'Small', NULL, NULL, NULL, NULL, 0, 5, 2023, 'HQ', 'New Delhi', 'Delhi', '110001', 'General', 'Male', 0, 0, 0);

-- NOTE: Schemes are loaded by migration 0003_official_schemes.sql (authoritative M/o MSME catalogue).

-- What's New / changelog (2025-26 updates)
INSERT INTO scheme_updates (scheme_code, title, summary, tag, source, effective_date) VALUES
 ('SME-GROWTH', 'SME Growth Fund launched (₹10,000 Cr)', 'New fund-of-funds to provide growth/equity capital to high-potential champion MSMEs.', 'budget', 'Union Budget 2025-26', '2025-02-01'),
 ('MSE-GIFT', 'MSE GIFT Scheme introduced', 'Green Investment & Financing for Transformation - interest subvention and subsidy for clean-tech adoption.', 'new', 'Union Budget 2025-26', '2025-02-01'),
 ('MSE-SPICE', 'MSE SPICE for Circular Economy', 'First credit-linked scheme dedicated to circular-economy and recycling projects in MSEs.', 'new', 'Union Budget 2025-26', '2025-02-01'),
 ('MSME-TEAM', 'MSME TEAM Initiative live', 'Trade Enablement & Marketing - onboard MSMEs to ONDC/e-commerce with branding & catalogue support.', 'new', 'Budget 2024-25', '2024-07-23'),
 ('CGTMSE', 'CGTMSE cover enhanced to ₹10 crore', 'Collateral-free guarantee limit raised; coverage up to 85% for micro loans.', 'updated', 'M/o MSME notification', '2025-04-01'),
 (NULL, 'Revised MSME classification (2026)', 'Micro: Inv ≤₹2.5cr & TO ≤₹10cr; Small: Inv ≤₹25cr & TO ≤₹100cr; Medium: Inv ≤₹125cr & TO ≤₹500cr.', 'updated', 'Union Budget 2025-26', '2025-04-01'),
 (NULL, 'Online Dispute Resolution (ODR) for delayed payments', 'New ODR mechanism to fast-track resolution of delayed-payment disputes for MSMEs.', 'new', 'M/o MSME', '2025-03-01');

-- Documents for demo user
INSERT OR IGNORE INTO documents (user_id, doc_type, file_name, file_size, mime_type, status, version, ocr_data) VALUES
 (1, 'aadhaar', 'aadhaar_card.pdf', 245000, 'application/pdf', 'verified', 1, '{"extracted":{"name":"Yogesh Sharma","aadhaar":"XXXX XXXX 4521"},"confidence":0.96}'),
 (1, 'pan', 'pan_card.pdf', 180000, 'application/pdf', 'verified', 1, '{"extracted":{"pan":"ABCPS1234K"},"confidence":0.95}'),
 (1, 'gst', 'gst_certificate.pdf', 320000, 'application/pdf', 'verified', 1, '{"extracted":{"gstin":"27ABCPS1234K1Z5"},"confidence":0.94}'),
 (1, 'bank_statement', 'sbi_statement_q1.pdf', 540000, 'application/pdf', 'uploaded', 1, '{"extracted":{"bank":"SBI","closing_balance":245000},"confidence":0.92}');

-- KYC records
INSERT OR IGNORE INTO verification_records (user_id, kyc_type, reference_number, status, result_data, verified_at) VALUES
 (1, 'aadhaar', '123456784521', 'verified', '{"verified":true,"provider":"MSME-Sahay-KYC-Gateway"}', CURRENT_TIMESTAMP),
 (1, 'pan', 'ABCPS1234K', 'verified', '{"verified":true}', CURRENT_TIMESTAMP),
 (1, 'gst', '27ABCPS1234K1Z5', 'verified', '{"verified":true}', CURRENT_TIMESTAMP);

-- Financial records (6 months matching frontend chart)
INSERT OR IGNORE INTO financial_records (user_id, period, revenue, expenses, category_breakdown) VALUES
 (1, '2024-12', 520000, 310000, '{"Raw Materials":38,"Salaries":27,"Utilities":18,"Marketing":10,"Other":7}'),
 (1, '2025-01', 680000, 350000, '{"Raw Materials":38,"Salaries":27,"Utilities":18,"Marketing":10,"Other":7}'),
 (1, '2025-02', 720000, 340000, '{"Raw Materials":37,"Salaries":28,"Utilities":18,"Marketing":10,"Other":7}'),
 (1, '2025-03', 760000, 390000, '{"Raw Materials":39,"Salaries":26,"Utilities":18,"Marketing":10,"Other":7}'),
 (1, '2025-04', 800000, 410000, '{"Raw Materials":38,"Salaries":27,"Utilities":17,"Marketing":11,"Other":7}'),
 (1, '2025-05', 840000, 420000, '{"Raw Materials":38,"Salaries":27,"Utilities":18,"Marketing":10,"Other":7}');

-- Applications (scheme_id: 1=PMEGP, 3=CGTMSE, 15=ZED)
INSERT OR IGNORE INTO applications (user_id, scheme_id, status, amount_requested, form_data, reference_no, submitted_at) VALUES
 (1, 1, 'under_review', 2500000, '{"purpose":"Machinery upgrade"}', 'MSME10012345', '2025-05-10 10:00:00'),
 (1, 3, 'submitted', 5000000, '{"purpose":"Working capital"}', 'MSME10012346', '2025-05-20 14:30:00'),
 (1, 15, 'approved', 200000, '{"purpose":"ZED certification"}', 'MSME10012340', '2025-04-01 09:00:00');

-- Notifications
INSERT OR IGNORE INTO notifications (user_id, title, body, type, read) VALUES
 (1, 'Application Approved', 'Your ZED Certification application (Ref: MSME10012340) has been approved!', 'success', 0),
 (1, 'PMEGP Deadline Approaching', 'The PMEGP application deadline is June 15, 2025. Complete your application now.', 'warning', 0),
 (1, 'Document Verified', 'Your GST Certificate has been successfully verified.', 'success', 1),
 (1, 'Upload Pending', 'Upload your Udyam Registration certificate to unlock 3 more schemes.', 'info', 0);
