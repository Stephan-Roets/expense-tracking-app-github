-- ============================================
-- VAT FIELDS MIGRATION
-- ============================================

-- Add VAT-related fields to expenses table
-- These are nullable because we don't know the historical VAT treatment
ALTER TABLE expenses 
ADD COLUMN amount_includes_vat BOOLEAN,
ADD COLUMN vat_amount_cents BIGINT,
ADD COLUMN net_amount_cents BIGINT;
