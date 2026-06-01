-- ============================================================
-- MSME Sahay - Seed Data
-- Demo password: Demo@123  |  Admin password: Admin@123
-- ============================================================

-- Users
INSERT OR IGNORE INTO users (id, email, phone, password_hash, password_salt, full_name, role, status, email_verified, phone_verified) VALUES
 (1, 'yogesh@sharma.in', '+919876543210', '5ac8ed405fa5f33346c1f096ca72d98dd680d8649d860ad2b976ebc162b08faf', 'ade5064009aa6fc89ad07a1d6feaaed1', 'Yogesh Sharma', 'user', 'active', 1, 1),
 (2, 'admin@msmesahay.in', '+919999900000', '86f01076f2613231cf3685340bb4678e6ac8a6047a5d2041110148120f43a10f', 'c54f11f58ef0292884b6563e18bd597b', 'Platform Admin', 'admin', 'active', 1, 1);

-- Profiles
INSERT OR IGNORE INTO profiles (user_id, designation, business_name, business_category, business_size, gst_number, pan_number, udyam_number, aadhaar_masked, annual_turnover, employee_count, year_established, address_line, city, state, pincode) VALUES
 (1, 'Founder & CEO', 'Sharma Manufacturing Co', 'Manufacturing', 'Micro', '27ABCPS1234K1Z5', 'ABCPS1234K', 'UDYAM-MH-26-0012345', 'XXXX XXXX 4521', 8400000, 12, 2019, 'Plot 24, MIDC Industrial Area', 'Pune', 'Maharashtra', '411019'),
 (2, 'Administrator', 'MSME Sahay Platform', 'Services', 'Small', NULL, NULL, NULL, NULL, 0, 5, 2023, 'HQ', 'New Delhi', 'Delhi', '110001');

-- Schemes (real Indian govt MSME schemes)
INSERT OR IGNORE INTO schemes (code, name, ministry, category, description, max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover, required_docs, deadline) VALUES
 ('PMEGP', 'Prime Minister Employment Generation Programme', 'Ministry of MSME', 'Subsidy', 'Credit-linked subsidy for setting up micro enterprises in manufacturing/service sectors. Up to 35% subsidy.', 5000000, 35, 0, 'Micro,Small', 'Manufacturing,Services', 0, 50000000, 'aadhaar,pan,udyam', '2025-06-15'),
 ('CGTMSE', 'Credit Guarantee Fund Trust for Micro & Small Enterprises', 'Ministry of MSME', 'Credit Guarantee', 'Collateral-free credit guarantee cover up to ₹5 Crore for micro & small enterprises.', 50000000, 0, 9.5, 'Micro,Small', 'Manufacturing,Services,Trading', 0, 250000000, 'udyam,gst,bank_statement', '2025-12-31'),
 ('MUDRA', 'Pradhan Mantri MUDRA Yojana', 'Ministry of Finance', 'Loan', 'Loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises (Shishu/Kishore/Tarun).', 1000000, 0, 8.5, 'Micro', 'Manufacturing,Services,Trading', 0, 10000000, 'aadhaar,pan', '2025-09-30'),
 ('CLCSS', 'Credit Linked Capital Subsidy Scheme', 'Ministry of MSME', 'Subsidy', '15% capital subsidy for technology upgradation of micro & small enterprises in manufacturing.', 1500000, 15, 0, 'Micro,Small', 'Manufacturing', 1000000, 100000000, 'udyam,gst,financial_report', '2025-08-20'),
 ('ZED', 'MSME Sustainable (ZED) Certification', 'Ministry of MSME', 'Grant', 'Zero Defect Zero Effect certification with subsidy on certification cost and handholding support.', 200000, 80, 0, 'Micro,Small,Medium', 'Manufacturing', 0, 250000000, 'udyam', '2025-11-30'),
 ('SFURTI', 'Scheme of Fund for Regeneration of Traditional Industries', 'Ministry of MSME', 'Grant', 'Support for traditional industry clusters with infrastructure and capacity building.', 25000000, 90, 0, 'Micro,Small', 'Manufacturing', 0, 50000000, 'udyam,gst', '2025-10-15'),
 ('STANDUP', 'Stand-Up India Scheme', 'Ministry of Finance', 'Loan', 'Bank loans between ₹10 lakh and ₹1 Crore for SC/ST and women entrepreneurs.', 10000000, 0, 9.0, 'Micro,Small', 'Manufacturing,Services,Trading', 0, 100000000, 'aadhaar,pan,udyam,bank_statement', '2025-12-31'),
 ('TUFS', 'Technology Upgradation Fund Scheme', 'Ministry of Textiles', 'Subsidy', 'Capital subsidy for technology upgradation in the textile sector.', 3000000, 20, 0, 'Small,Medium', 'Manufacturing', 5000000, 250000000, 'udyam,gst,financial_report', '2025-07-31');

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

-- Applications
INSERT OR IGNORE INTO applications (user_id, scheme_id, status, amount_requested, form_data, reference_no, submitted_at) VALUES
 (1, 1, 'under_review', 2500000, '{"purpose":"Machinery upgrade"}', 'MSME10012345', '2025-05-10 10:00:00'),
 (1, 2, 'submitted', 5000000, '{"purpose":"Working capital"}', 'MSME10012346', '2025-05-20 14:30:00'),
 (1, 3, 'approved', 800000, '{"purpose":"Inventory"}', 'MSME10012340', '2025-04-01 09:00:00');

-- Notifications
INSERT OR IGNORE INTO notifications (user_id, title, body, type, read) VALUES
 (1, 'Application Approved', 'Your MUDRA loan application (Ref: MSME10012340) for ₹8,00,000 has been approved!', 'success', 0),
 (1, 'PMEGP Deadline Approaching', 'The PMEGP application deadline is June 15, 2025. Complete your application now.', 'warning', 0),
 (1, 'Document Verified', 'Your GST Certificate has been successfully verified.', 'success', 1),
 (1, 'Upload Pending', 'Upload your Udyam Registration certificate to unlock 3 more schemes.', 'info', 0);
