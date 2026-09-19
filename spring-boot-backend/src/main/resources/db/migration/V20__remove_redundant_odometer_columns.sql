-- Remove redundant odometer columns from vehicle_tax_profiles
-- These columns are no longer needed because odometer readings are now
-- sourced from the authoritative OdometerVerification entity

ALTER TABLE vehicle_tax_profiles DROP COLUMN IF EXISTS march_1st_photo_odometer;
ALTER TABLE vehicle_tax_profiles DROP COLUMN IF EXISTS feb_28th_photo_odometer;
