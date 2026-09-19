-- Add fleet feature visibility settings to organizations table
ALTER TABLE organizations ADD COLUMN condition_report_enabled BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN odometer_confirmation_enabled BOOLEAN DEFAULT true;
