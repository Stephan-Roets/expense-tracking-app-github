-- ============================================================================
-- ALTER USERS - ADD EMAIL VERIFICATION TOKEN COLUMN
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
