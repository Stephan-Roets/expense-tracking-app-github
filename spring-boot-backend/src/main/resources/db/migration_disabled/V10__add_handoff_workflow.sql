-- ============================================
-- HANDOFF WORKFLOW MIGRATION
-- ============================================

-- Step 1: Add PENDING to assignment_status enum
ALTER TYPE assignment_status ADD VALUE 'PENDING' IF NOT EXISTS;

-- Step 2: Change INACTIVE to ENDED for existing records
UPDATE vehicle_assignment SET status = 'ENDED' WHERE status = 'INACTIVE';

-- Step 3: Create handoff_state enum
CREATE TYPE handoff_state AS ENUM (
    'PENDING_HANDOFF_INITIATED',
    'AWAITING_OLD_DRIVER_CONDITION',
    'AWAITING_OLD_DRIVER_ODOMETER',
    'AWAITING_MANAGER_APPROVAL',
    'AWAITING_NEW_DRIVER_CONDITION',
    'AWAITING_NEW_DRIVER_ODOMETER',
    'HANDOFF_COMPLETE'
);

-- Step 4: Create vehicle_handoff table
CREATE TABLE vehicle_handoff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicle(id),
    old_assignment_id UUID REFERENCES vehicle_assignment(id),
    new_assignment_id UUID REFERENCES vehicle_assignment(id),
    initiated_by_id UUID NOT NULL REFERENCES "user"(id),
    state handoff_state NOT NULL DEFAULT 'PENDING_HANDOFF_INITIATED',
    manager_approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by_id UUID REFERENCES "user"(id),
    cancellation_reason VARCHAR(500),
    override_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_handoff_vehicle ON vehicle_handoff(vehicle_id);
CREATE INDEX idx_vehicle_handoff_state ON vehicle_handoff(state);

-- ============================================
-- CONDITION REPORT & ODOMETER: ADD PURPOSE
-- ============================================

-- Step 5: Add nullable purpose columns first
ALTER TABLE vehicle_condition_report ADD COLUMN IF NOT EXISTS purpose VARCHAR(20);
ALTER TABLE odometer_confirmation ADD COLUMN IF NOT EXISTS purpose VARCHAR(20);

-- Step 6: Backfill existing records with ONBOARDING
UPDATE vehicle_condition_report SET purpose = 'ONBOARDING' WHERE purpose IS NULL;
UPDATE odometer_confirmation SET purpose = 'ONBOARDING' WHERE purpose IS NULL;

-- Step 7: Make columns NOT NULL
ALTER TABLE vehicle_condition_report ALTER COLUMN purpose SET NOT NULL;
ALTER TABLE odometer_confirmation ALTER COLUMN purpose SET NOT NULL;

-- Step 8: Drop old unique constraints if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vehicle_condition_report_assignment_id_key'
    ) THEN
        ALTER TABLE vehicle_condition_report DROP CONSTRAINT vehicle_condition_report_assignment_id_key;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'odometer_confirmation_assignment_id_key'
    ) THEN
        ALTER TABLE odometer_confirmation DROP CONSTRAINT odometer_confirmation_assignment_id_key;
    END IF;
END $$;

-- Step 9: Create purpose enums
CREATE TYPE condition_report_purpose AS ENUM ('ONBOARDING', 'HANDOFF');
CREATE TYPE odometer_confirmation_purpose AS ENUM ('ONBOARDING', 'HANDOFF');

-- Step 10: Convert columns to enum type
ALTER TABLE vehicle_condition_report ALTER COLUMN purpose TYPE condition_report_purpose 
    USING purpose::condition_report_purpose;

ALTER TABLE odometer_confirmation ALTER COLUMN purpose TYPE odometer_confirmation_purpose 
    USING purpose::odometer_confirmation_purpose;

-- Step 11: Add composite unique constraints
ALTER TABLE vehicle_condition_report 
    ADD CONSTRAINT uq_condition_report_assignment_purpose 
    UNIQUE (assignment_id, purpose);

ALTER TABLE odometer_confirmation 
    ADD CONSTRAINT uq_odometer_assignment_purpose 
    UNIQUE (assignment_id, purpose);

-- Step 12: Create indexes for performance
CREATE INDEX idx_condition_report_assignment_purpose ON vehicle_condition_report(assignment_id, purpose);
CREATE INDEX idx_odometer_assignment_purpose ON odometer_confirmation(assignment_id, purpose);
