-- ============================================================================
-- ALTER ORGANIZATIONS - ADD MISSING COLUMNS
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS condition_report_enabled BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS odometer_confirmation_enabled BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_tax_calculation_method VARCHAR(30);
