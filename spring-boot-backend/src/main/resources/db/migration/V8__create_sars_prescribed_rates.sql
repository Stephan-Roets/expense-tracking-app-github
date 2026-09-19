-- ============================================
-- SARS PRESCRIBED RATES TABLE
-- ============================================
-- This migration creates the sars_prescribed_rates table for Phase 2 tax calculation
-- Source: SARS Notice 5936 (GG 52199, gazetted 28 Feb 2025) for 2026
-- Source: SARS Notice 7182 (GG 54228, approved 25 Feb 2026) for 2027

CREATE TABLE sars_prescribed_rates (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL UNIQUE,
    rate_cents_per_km BIGINT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SEED DATA: 2026 TAX YEAR (1 Mar 2025 - 28 Feb 2026)
-- Rate: 476 cents/km (R4.76/km)
-- Source: SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)
-- Published: 28 February 2025
-- ============================================

INSERT INTO sars_prescribed_rates (
    tax_year, rate_cents_per_km, source_name, source_url, published_at
) VALUES (
    2026, 476,
    'SARS Travel Allowance 2025/26 (Notice 5936, GG 52199)',
    'https://www.sars.gov.za/legal-notice/notice-5936-government-gazette-52199-28-february-2025/',
    '2025-02-28 00:00:00'
);

-- ============================================
-- SEED DATA: 2027 TAX YEAR (1 Mar 2026 - 28 Feb 2027)
-- Rate: 495 cents/km (R4.95/km)
-- Source: SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)
-- Published: 25 February 2026
-- ============================================

INSERT INTO sars_prescribed_rates (
    tax_year, rate_cents_per_km, source_name, source_url, published_at
) VALUES (
    2027, 495,
    'SARS Travel Allowance 2026/27 (Notice 7182, GG 54228)',
    'https://www.sars.gov.za/legal-notice/notice-7182-government-gazette-54228-25-february-2026/',
    '2026-02-25 00:00:00'
);
