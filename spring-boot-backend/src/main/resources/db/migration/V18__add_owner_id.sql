-- ============================================================================
-- ALTER ORGANIZATIONS - ADD OWNER ID COLUMN
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID;
