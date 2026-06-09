-- ============================================================
-- MSME Sahay - Official MSME Schemes (from M/o MSME booklet)
-- + New 2025-26 Budget schemes. This is idempotent: it clears
-- the demo schemes and loads the authoritative catalogue.
-- ============================================================

-- Clear earlier demo schemes & dependent computed rows (keep applications referencing by re-seed below)
DELETE FROM eligibility_results;
DELETE FROM schemes;

-- Reset autoincrement so scheme ids are stable for seeded applications
DELETE FROM sqlite_sequence WHERE name = 'schemes';

-- 1. PMEGP
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (1, 'PMEGP', 'Prime Minister''s Employment Generation Programme', 'PMEGP', 'Ministry of MSME / KVIC', 'Subsidy',
  'Generate employment by setting up new self-employment ventures/micro enterprises.',
  'Credit-linked subsidy programme for setting up new micro enterprises in manufacturing and service sectors.',
  5000000, 35, 0, 'Micro', 'Manufacturing,Services', 0, 100000000,
  0, 'aadhaar,pan,udyam,project_report',
  '["Margin Money subsidy 15-25% (General) and 25-35% (Special: SC/ST/Women/NER/Aspirational districts)","Max project cost: Rs.50 lakh (manufacturing), Rs.20 lakh (service)","Beneficiary contribution: 10% (General), 5% (Special)"]',
  'Apply online on the KVIC PMEGP e-portal, attach project report and documents, bank appraisal, then EDP training.',
  'https://www.kviconline.gov.in/pmegpeportal/', '["Prepare a detailed, realistic project report","Complete the mandatory EDP training","New units only - existing units are not eligible"]',
  '', 0, 0, '', 1, '2026-03-31', 0, '2008-08-15', 1);

-- 2. PMEGP 2nd Loan
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (2, 'PMEGP-2', '2nd Loan for Up-gradation of existing PMEGP/MUDRA units', 'PMEGP-2', 'Ministry of MSME / KVIC', 'Subsidy',
  'Expansion/up-gradation of well-performing existing PMEGP/REGP/MUDRA units.',
  'Second loan for upgradation of existing profitable PMEGP/MUDRA units.',
  10000000, 15, 0, 'Micro,Small', 'Manufacturing,Services', 0, 1000000000,
  0, 'udyam,pan,bank_statement,financial_report',
  '["Subsidy up to 15% (20% for NER/Hill states)","Max project cost Rs.1 crore (manufacturing), Rs.25 lakh (service)","For units profitable in last 3 years with first loan repaid on time"]',
  'Apply via PMEGP e-portal selecting the 2nd-loan option; submit proof of 3-year profitability and loan repayment.',
  'https://www.kviconline.gov.in/pmegpeportal/', '["Maintain clean repayment record on the first loan","Show 3 years of profitability","Udyam registration is mandatory"]',
  '', 3, 999, '', 1, '2026-03-31', 0, '2018-04-01', 1);

-- 3. CGTMSE
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (3, 'CGTMSE', 'Credit Guarantee Scheme for Micro & Small Enterprises', 'CGTMSE', 'Ministry of MSME / CGTMSE Trust', 'Credit Guarantee',
  'Provide collateral-free / third-party-guarantee-free credit to micro & small enterprises.',
  'Credit guarantee cover enabling collateral-free loans for MSEs.',
  100000000, 0, 9.5, 'Micro,Small', 'Manufacturing,Services,Trading', 0, 1000000000,
  0, 'udyam,gst,bank_statement',
  '["Collateral-free loans up to Rs.10 crore (enhanced coverage)","Guarantee coverage 75%-85% (85% for micro loans up to Rs.5 lakh)","Available to existing and aspiring entrepreneurs"]',
  'Approach a member lending institution (bank/NBFC); the bank applies for guarantee cover under CGTMSE.',
  'https://www.cgtmse.in/', '["Apply through a CGTMSE member bank","Keep Udyam and GST records ready","Strong project viability improves sanction"]',
  '', 0, 999, '', 1, '2026-12-31', 0, '2000-08-30', 1);

-- 4. MSE-CDP
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (4, 'MSE-CDP', 'Micro & Small Enterprises Cluster Development Programme', 'MSE-CDP', 'Ministry of MSME', 'Grant',
  'Support sustainability/growth of MSEs through common facilities and infrastructure.',
  'Cluster development via Common Facility Centres and Infrastructure Development through SPVs.',
  300000000, 80, 0, 'Micro,Small', 'Manufacturing,Services', 0, 1000000000,
  0, 'udyam,project_report',
  '["GoI assistance up to 80% of project cost (max Rs.30 cr) for Common Facility Centres","70% (max Rs.15 cr) for Infrastructure Development","Implemented through Special Purpose Vehicles (SPVs)"]',
  'Form an SPV of cluster enterprises and apply through the State/DC-MSME with a diagnostic study report.',
  'https://msmecdp.gov.in/', '["Organise the cluster into a formal SPV","Prepare a diagnostic study report","Demonstrate collective benefit"]',
  '', 0, 999, '', 1, '2026-03-31', 0, '2007-01-01', 1);

-- 5. SFURTI
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (5, 'SFURTI', 'Scheme of Fund for Regeneration of Traditional Industries', 'SFURTI', 'Ministry of MSME / KVIC / Coir Board', 'Grant',
  'Organise traditional industries and artisans into competitive clusters.',
  'Support for traditional industry clusters (handicraft, bamboo, honey, coir).',
  50000000, 90, 0, 'Micro,Small', 'Manufacturing', 0, 50000000,
  0, 'udyam,project_report',
  '["Up to Rs.2.5 cr (up to 500 artisans) or Rs.5 cr (>500 artisans)","GoI covers 90-95% of hard intervention cost","For traditional industry artisans"]',
  'Apply through an Implementing Agency (KVIC/Coir Board/NGO) with a cluster proposal.',
  'https://sfurti.msme.gov.in/', '["Tie up with an experienced Implementing Agency","Map artisans and traditional craft","Show market linkage plan"]',
  'Rural', 0, 999, '', 0, '2026-03-31', 0, '2005-01-01', 1);

-- 10. National SC-ST Hub
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (10, 'NSSH', 'National SC-ST Hub Scheme', 'NSSH', 'Ministry of MSME / NSIC', 'Subsidy',
  'Professional support to SC/ST entrepreneurs to participate in public procurement.',
  'Support for SC/ST entrepreneurs incl. subsidy on plant & machinery and fee reimbursements.',
  2500000, 25, 0, 'Micro,Small,Medium', 'Manufacturing,Services,Trading', 0, 1000000000,
  0, 'aadhaar,udyam,caste_certificate',
  '["25% subsidy on plant & machinery (max Rs.25 lakh)","80-100% reimbursement of bank guarantee/testing/certification fees","Mentoring & public procurement support"]',
  'Register on the NSSH portal as an SC/ST entrepreneur and apply for relevant components.',
  'https://www.scsthub.in/', '["Keep a valid caste certificate ready","Register on the NSSH portal","Target CPSE procurement opportunities"]',
  'SC,ST', 0, 999, '', 1, '2026-03-31', 0, '2016-10-18', 1);

-- 12. Khadi Gramodyog Vikas Yojana (toolkits / women preference)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (12, 'KGVY', 'Khadi Gramodyog Vikas Yojana', 'KGVY', 'Ministry of MSME / KVIC', 'Subsidy',
  'Increase artisans'' productivity & wages in Khadi and village industries.',
  'Support for Khadi institutions and artisans incl. MMDA subsidy and interest subsidy.',
  500000, 35, 4, 'Micro', 'Manufacturing', 0, 10000000,
  0, 'aadhaar,udyam',
  '["MMDA subsidy 20-35%","Interest subsidy (ISEC) - borrower pays only 4%","Free toolkit distribution (beekeeping/pottery/leather)"]',
  'Apply through KVIC / State Khadi Boards; artisans must be aged 18-55.',
  'https://www.kvic.gov.in/', '["Preference for SC/ST/Women artisans","Be within the 18-55 age band","Link to a recognised Khadi institution"]',
  'SC,ST,Women,Rural', 0, 999, '', 0, '2026-03-31', 0, '2018-04-01', 1);

-- 15. ZED Certification (MSME Champions)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (15, 'ZED', 'MSME Sustainable (ZED) Certification', 'ZED', 'Ministry of MSME', 'Grant',
  'Encourage Zero Defect Zero Effect manufacturing practices.',
  'Certification subsidy and handholding for quality & sustainable manufacturing.',
  200000, 80, 0, 'Micro,Small,Medium', 'Manufacturing', 0, 1000000000,
  0, 'udyam',
  '["Certification cost subsidy: 80% (Micro), 60% (Small), 50% (Medium)","Up to Rs.2 lakh for consultancy/handholding","Additional subsidy for Women/SC-ST owned & NER units"]',
  'Register on the ZED portal, take the ZED pledge, apply for Bronze/Silver/Gold certification.',
  'https://zed.msme.gov.in/', '["Start with the free ZED pledge","Maintain quality documentation","Women/SC-ST units get extra subsidy"]',
  '', 0, 999, '', 1, '2026-03-31', 0, '2022-04-01', 1);

-- 17. MSME-Innovative (Incubation/IPR/Design)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (17, 'MSME-INNO', 'MSME Innovative Scheme (Incubation, IPR, Design)', 'MSME-Innovative', 'Ministry of MSME', 'Grant',
  'Promote innovation from concept to market - incubation, IP protection, design.',
  'Financial assistance for incubation of ideas, IPR registration and design support.',
  1500000, 0, 0, 'Micro,Small,Medium', 'Manufacturing,Services', 0, 1000000000,
  0, 'udyam',
  '["Up to Rs.15 lakh per approved idea (incubation)","Up to Rs.5 lakh reimbursement for patent registration","Design project support"]',
  'Apply through registered Host Institutions on the MSME-Innovative portal.',
  'https://innovative.msme.gov.in/', '["Articulate a clear innovation/idea","Attach prototypes or proof of concept","Engage a registered Host Institution"]',
  '', 0, 999, '', 1, '2026-03-31', 0, '2022-03-01', 1);

-- 18. CGSSD (Subordinate Debt)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (18, 'CGSSD', 'Credit Guarantee Scheme for Subordinate Debt', 'CGSSD', 'Ministry of MSME / CGTMSE', 'Credit Guarantee',
  'Revive stressed MSME units (NPA / restructured accounts).',
  'Sub-debt support to promoters of stressed/operational MSMEs.',
  7500000, 0, 9, 'Micro,Small,Medium', 'Manufacturing,Services,Trading', 0, 1000000000,
  0, 'udyam,bank_statement,financial_report',
  '["Credit equal to 50% of promoter stake (max Rs.75 lakh)","90% guarantee coverage","For operational stressed MSMEs / NPAs"]',
  'Approach the lending bank for sub-debt under CGSSD; bank seeks guarantee from CGTMSE.',
  'https://www.cgtmse.in/', '["Unit must be operational and viable","NPA as of the notified cut-off date","Promoter must inject the sub-debt as stake"]',
  '', 2, 999, '', 1, '2026-03-31', 0, '2020-06-01', 1);

-- 19. SRI Fund
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (19, 'SRI', 'Self Reliant India (SRI) Fund', 'SRI Fund', 'Ministry of MSME / NVCFL', 'Equity',
  'Provide equity/growth capital to viable MSMEs via daughter funds.',
  'Equity growth capital to help viable MSMEs scale and graduate beyond the MSME bracket.',
  500000000, 0, 0, 'Small,Medium', 'Manufacturing,Services', 5000000, 5000000000,
  0, 'udyam,financial_report,gst',
  '["Growth/equity capital through daughter funds","Helps MSMEs scale beyond the MSME bracket","Mentoring and investor networks"]',
  'Approach SEBI-registered daughter funds under the SRI Fund / NVCFL; pitch growth plan.',
  'https://www.nsic.co.in/', '["Show a positive growth trajectory","Audited financials strengthen the pitch","NBFCs and non-profits are excluded"]',
  '', 2, 999, '', 1, '2026-03-31', 0, '2021-06-01', 1);

-- 20. RAMP
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (20, 'RAMP', 'Raising and Accelerating MSME Performance', 'RAMP', 'Ministry of MSME (World Bank supported)', 'Grant',
  'Improve MSME access to market, finance and technology; greening & digitisation.',
  'World Bank-supported scheme improving MSME competitiveness via state agencies.',
  0, 0, 0, 'Micro,Small,Medium', 'Manufacturing,Services,Trading', 0, 1000000000,
  0, 'udyam',
  '["Improved access to market, finance & technology","Support for digitisation and greening","Reduction of delayed payments"]',
  'Participate through State Government implementing agencies and SIPs under RAMP.',
  'https://ramp.msme.gov.in/', '["Engage with your state RAMP cell","Adopt digital & green practices","Register on Udyam"]',
  '', 0, 999, '', 1, '2026-03-31', 0, '2022-06-30', 1);

-- ===== NEW 2025-26 BUDGET SCHEMES =====

-- SME Growth Fund
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (30, 'SME-GROWTH', 'SME Growth Fund', 'SME Growth Fund', 'Ministry of MSME / Budget 2025-26', 'Equity',
  'Provide growth capital to high-potential "champion" MSMEs to scale rapidly.',
  'Rs.10,000 crore fund-of-funds to scale high-potential MSMEs (Budget 2025-26).',
  100000000, 0, 0, 'Small,Medium', 'Manufacturing,Services', 10000000, 5000000000,
  0, 'udyam,financial_report,gst',
  '["Equity / growth capital from a Rs.10,000 cr fund","Targets high-growth champion MSMEs","Investor mentoring & scale-up support"]',
  'Apply via empanelled daughter funds; submit growth plan and audited financials.',
  'https://msme.gov.in/', '["Demonstrate strong revenue growth","Have audited financials ready","Show a clear scale-up roadmap"]',
  '', 1, 999, '', 1, '2026-03-31', 1, '2025-02-01', 1);

-- MSE GIFT (Green Investment)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (31, 'MSE-GIFT', 'MSE Green Investment & Financing for Transformation', 'MSE GIFT', 'Ministry of MSME / Budget 2025-26', 'Subsidy',
  'Finance green technology adoption and energy-efficient transformation of MSEs.',
  'Green investment financing & interest subvention for MSE clean-tech adoption (Budget 2025-26).',
  5000000, 25, 6, 'Micro,Small', 'Manufacturing', 0, 1000000000,
  0, 'udyam,project_report',
  '["Interest subvention for green/energy-efficient investments","Capital subsidy for clean technology adoption","Support for emission reduction"]',
  'Apply through participating banks adopting the GIFT framework with a green project proposal.',
  'https://msme.gov.in/', '["Prepare an energy-efficiency / green project plan","Quantify expected emission savings","Combine with ZED certification"]',
  '', 0, 999, '', 1, '2026-03-31', 1, '2025-02-01', 1);

-- MSE SPICE (Circular Economy)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (32, 'MSE-SPICE', 'MSE Scheme for Promotion & Investment in Circular Economy', 'MSE SPICE', 'Ministry of MSME / Budget 2025-26', 'Subsidy',
  'Promote circular-economy projects and resource efficiency in MSEs.',
  'Credit-linked support for circular-economy / recycling projects in MSEs (Budget 2025-26).',
  5000000, 25, 0, 'Micro,Small', 'Manufacturing,Services', 0, 1000000000,
  0, 'udyam,project_report',
  '["Credit-linked subsidy for circular-economy projects","Support for recycling and resource efficiency","First scheme dedicated to circular economy in MSEs"]',
  'Apply through participating financial institutions with a circular-economy project proposal.',
  'https://msme.gov.in/', '["Design a recycling/resource-recovery project","Show measurable waste reduction","Pair with green financing"]',
  '', 0, 999, '', 1, '2026-03-31', 1, '2025-02-01', 1);

-- MSME TEAM (Trade Enablement)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (33, 'MSME-TEAM', 'MSME Trade Enablement & Marketing (TEAM) Initiative', 'MSME TEAM', 'Ministry of MSME / Budget 2024-25', 'Grant',
  'Onboard MSMEs onto ONDC and digital commerce; enable online trade.',
  'Support to onboard MSMEs to e-commerce/ONDC with catalogue, branding and digital marketing.',
  500000, 100, 0, 'Micro,Small', 'Manufacturing,Services,Trading', 0, 1000000000,
  0, 'udyam',
  '["Onboarding to ONDC and digital marketplaces","Support for cataloguing, packaging & branding","Special focus on women-led MSEs"]',
  'Register interest through the MSME TEAM portal / ONDC network participants.',
  'https://msme.gov.in/', '["Digitise your product catalogue","Adopt good packaging & branding","Women-led units get priority"]',
  'Women', 0, 999, '', 1, '2026-03-31', 1, '2024-07-23', 1);

-- TREAD (Women)
INSERT INTO schemes (id, code, name, abbreviation, ministry, category, objective, description,
  max_benefit, subsidy_pct, interest_rate, eligible_size, eligible_category, min_turnover, max_turnover,
  max_investment, required_docs, benefits, application_process, application_link, success_tips,
  special_categories, min_business_age, max_business_age, eligible_states, udyam_required, deadline, is_new, launched_on, active)
VALUES (34, 'TREAD', 'Trade Related Entrepreneurship Assistance & Development (Women)', 'TREAD', 'Ministry of MSME', 'Grant',
  'Empower women entrepreneurs through credit, training and development.',
  'Government grant up to 30% of project cost for women entrepreneurs via NGOs, plus training.',
  3000000, 30, 0, 'Micro,Small', 'Manufacturing,Services,Trading', 0, 100000000,
  0, 'aadhaar,udyam',
  '["Government grant up to 30% of project cost","Credit channelled through NGOs to women entrepreneurs","Training and counselling support"]',
  'Apply through registered NGOs/associations partnering under the TREAD scheme.',
  'https://msme.gov.in/', '["Exclusively for women entrepreneurs","Partner with a registered NGO","Combine with PMEGP special-category subsidy"]',
  'Women', 0, 999, '', 0, '2026-03-31', 0, '2005-01-01', 1);
