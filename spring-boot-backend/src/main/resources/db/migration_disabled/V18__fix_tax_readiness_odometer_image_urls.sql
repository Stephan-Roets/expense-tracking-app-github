-- Fix old Tax Readiness Audit odometer image URLs that use incorrect folder name
-- Replace 'odometer-readings' with 'odometer-readings-for-tax-readings-audit' in image_url_avif
UPDATE odometer_verifications
SET image_url_avif = REPLACE(image_url_avif, 'odometer-readings', 'odometer-readings-for-tax-readings-audit')
WHERE image_url_avif LIKE '%odometer-readings%';
