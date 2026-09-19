-- Add service interval columns to vehicles table
ALTER TABLE vehicles ADD COLUMN minor_service_interval_km INTEGER;
ALTER TABLE vehicles ADD COLUMN major_service_interval_km INTEGER;
ALTER TABLE vehicles ADD COLUMN brake_overhaul_interval_km INTEGER;
ALTER TABLE vehicles ADD COLUMN minor_service_interval_months INTEGER;
ALTER TABLE vehicles ADD COLUMN major_service_interval_months INTEGER;
ALTER TABLE vehicles ADD COLUMN brake_overhaul_interval_months INTEGER;
