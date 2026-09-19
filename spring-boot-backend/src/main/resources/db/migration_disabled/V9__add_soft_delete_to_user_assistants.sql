-- Add soft delete fields to user_assistants table
ALTER TABLE user_assistants
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN removed_at TIMESTAMPTZ,
ADD COLUMN removed_by UUID REFERENCES users(id);
