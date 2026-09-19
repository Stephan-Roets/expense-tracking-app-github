-- Allow null organization_id for permissions (for individual account assistants)
-- Individual assistants are scoped via user_assistants table, not organization_id

-- Drop the check constraint if it exists
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_context_check;

-- Drop the old unique constraint
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_organization_id_permission_type_permission_key_user_role_key;

-- Make organization_id nullable
ALTER TABLE permissions ALTER COLUMN organization_id DROP NOT NULL;

-- Add new unique constraint based on user_id instead of organization_id
ALTER TABLE permissions ADD CONSTRAINT permissions_user_id_permission_type_permission_key_user_role_key UNIQUE (user_id, permission_type, permission_key, user_role);
