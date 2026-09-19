-- ============================================================================
-- ALTER ORGANIZATIONS - ADD DEFAULT TAX CALCULATION METHOD
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_tax_calculation_method VARCHAR(30);
