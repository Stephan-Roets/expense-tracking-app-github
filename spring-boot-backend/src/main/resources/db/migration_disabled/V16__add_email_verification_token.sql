-- Add email verification token column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
