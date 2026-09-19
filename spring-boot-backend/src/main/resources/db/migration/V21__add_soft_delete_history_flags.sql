ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_deleted_odometer
    ON expenses (vehicle_id, is_deleted, odometer_reading);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_deleted_end_odometer
    ON trips (vehicle_id, is_deleted, end_odometer);

UPDATE expenses SET is_deleted = FALSE WHERE is_deleted IS NULL;
UPDATE trips SET is_deleted = FALSE WHERE is_deleted IS NULL;
