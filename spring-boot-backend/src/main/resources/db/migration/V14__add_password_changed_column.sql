-- ============================================================================
-- ALTER USERS - ADD MISSING COLUMNS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);
