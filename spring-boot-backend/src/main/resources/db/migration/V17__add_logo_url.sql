-- ============================================================================
-- ALTER ORGANIZATIONS - ADD MISSING COLUMNS
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID;
