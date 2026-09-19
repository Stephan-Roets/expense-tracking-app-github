-- ============================================================================
-- ALTER USERS - ADD PROFILE PHOTO URL COLUMN
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);
