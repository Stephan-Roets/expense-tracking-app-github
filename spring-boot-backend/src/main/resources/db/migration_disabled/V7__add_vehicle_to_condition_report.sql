-- Add vehicle_id column to vehicle_condition_report for SOLO account support
ALTER TABLE vehicle_condition_report ADD COLUMN vehicle_id UUID;
ALTER TABLE vehicle_condition_report ADD CONSTRAINT fk_condition_report_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
-- Make assignment_id nullable
ALTER TABLE vehicle_condition_report ALTER COLUMN assignment_id DROP NOT NULL;
