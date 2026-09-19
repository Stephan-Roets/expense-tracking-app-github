-- ============================================
-- SARS COST SCALE BRACKETS TABLE
-- ============================================
-- This migration creates the sars_cost_scale_brackets table for Phase 2 tax calculation
-- Bracket selection is by vehicle value, not annual kilometres
-- Source: SARS Notice 5936 (GG 52199, gazetted 28 Feb 2025) for 2026
-- Source: SARS Notice 7182 (GG 54228, approved 25 Feb 2026) for 2027

CREATE TABLE sars_cost_scale_brackets (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    bracket_index INTEGER NOT NULL,
    min_vehicle_value_cents BIGINT NOT NULL,
    max_vehicle_value_cents BIGINT,
    fixed_cost_cents BIGINT NOT NULL,
    fuel_cost_tenths_cents_per_km BIGINT NOT NULL,
    maintenance_cost_tenths_cents_per_km BIGINT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_tax_year_bracket UNIQUE (tax_year, bracket_index)
);

-- ============================================
-- SEED DATA: 2026 TAX YEAR (1 Mar 2025 - 28 Feb 2026)
-- Source: SARS Notice 5936, Government Gazette 52199, gazetted 28 February 2025
-- ============================================

INSERT INTO sars_cost_scale_brackets (
    tax_year, bracket_index, min_vehicle_value_cents, max_vehicle_value_cents,
    fixed_cost_cents, fuel_cost_tenths_cents_per_km, maintenance_cost_tenths_cents_per_km,
    source_name, source_url, published_at
) VALUES
-- Bracket 0: ≤ R100,000
(2026, 0, 0, 10000001, 3394000, 1467, 474,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 1: >R100,000–200,000
(2026, 1, 10000001, 20000001, 6068800, 1638, 593,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 2: >R200,000–300,000
(2026, 2, 20000001, 30000001, 8749700, 1779, 654,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 3: >R300,000–400,000
(2026, 3, 30000001, 40000001, 11127300, 1914, 714,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 4: >R400,000–500,000
(2026, 4, 40000001, 50000001, 13504800, 2048, 839,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 5: >R500,000–600,000
(2026, 5, 50000001, 60000001, 15993400, 2349, 985,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 6: >R600,000–700,000
(2026, 6, 60000001, 70000001, 18486700, 2389, 1105,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 7: >R700,000–800,000
(2026, 7, 70000001, 80000001, 21112100, 2429, 1225,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00'),
-- Bracket 8: >R800,000 (open-ended top bracket)
(2026, 8, 80000001, NULL, 21112100, 2429, 1225,
 'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
 'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
 '2025-02-28 00:00:00');

-- ============================================
-- SEED DATA: 2027 TAX YEAR (1 Mar 2026 - 28 Feb 2027)
-- Source: SARS Notice 7182, Government Gazette 54228, approved 25 February 2026
-- ============================================

INSERT INTO sars_cost_scale_brackets (
    tax_year, bracket_index, min_vehicle_value_cents, max_vehicle_value_cents,
    fixed_cost_cents, fuel_cost_tenths_cents_per_km, maintenance_cost_tenths_cents_per_km,
    source_name, source_url, published_at
) VALUES
-- Bracket 0: ≤ R115,000
(2027, 0, 0, 11500001, 3834400, 1329, 491,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 1: >R115,000–230,000
(2027, 1, 11500001, 23000001, 6848700, 1484, 614,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 2: >R230,000–345,000
(2027, 2, 23000001, 34500001, 9868900, 1612, 678,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 3: >R345,000–460,000
(2027, 3, 34500001, 46000001, 12539300, 1734, 740,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 4: >R460,000–575,000
(2027, 4, 46000001, 57500001, 15209700, 1855, 869,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 5: >R575,000–690,000
(2027, 5, 57500001, 69000001, 18007800, 2128, 1020,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 6: >R690,000–805,000
(2027, 6, 69000001, 80500001, 20810600, 2165, 1145,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 7: >R805,000–920,000
(2027, 7, 80500001, 92000001, 23767900, 2201, 1269,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00'),
-- Bracket 8: >R920,000 (open-ended top bracket)
(2027, 8, 92000001, NULL, 23767900, 2201, 1269,
 'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
 'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
 '2026-02-25 00:00:00');
