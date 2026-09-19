-- Add tax calculation configuration fields to vehicle_tax_profiles table
-- This enables per-vehicle configuration for tax calculation methods and company car status

-- Add default calculation method field (stores enum name as string)
ALTER TABLE vehicle_tax_profiles
ADD COLUMN default_calculation_method VARCHAR(50)
CHECK (default_calculation_method IN ('ACTUAL_COSTS', 'SARS_COST_SCALE', 'SIMPLIFIED_REIMBURSIVE'));

-- Add company provided vehicle toggle field
ALTER TABLE vehicle_tax_profiles
ADD COLUMN is_company_provided_vehicle BOOLEAN DEFAULT FALSE;

-- Add March 1st photo odometer field (tax year baseline)
ALTER TABLE vehicle_tax_profiles
ADD COLUMN march_1st_photo_odometer INTEGER;

-- Add February 28th photo odometer field (tax year closing)
ALTER TABLE vehicle_tax_profiles
ADD COLUMN feb_28th_photo_odometer INTEGER;

-- Set default values for existing records
UPDATE vehicle_tax_profiles
SET default_calculation_method = 'ACTUAL_COSTS',
    is_company_provided_vehicle = FALSE
WHERE default_calculation_method IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN vehicle_tax_profiles.default_calculation_method IS 'Default tax calculation method: ACTUAL_COSTS, SARS_COST_SCALE, or SIMPLIFIED_REIMBURSIVE';
COMMENT ON COLUMN vehicle_tax_profiles.is_company_provided_vehicle IS 'TRUE if vehicle is company-provided (fringe benefit), FALSE if personal vehicle';
COMMENT ON COLUMN vehicle_tax_profiles.march_1st_photo_odometer IS 'Locked baseline odometer reading at start of tax year (March 1st)';
COMMENT ON COLUMN vehicle_tax_profiles.feb_28th_photo_odometer IS 'Locked closing odometer reading at end of tax year (February 28th)';
