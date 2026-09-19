-- Fix old odometer confirmation image URLs that use incorrect folder name
-- Replace 'odometer-readings' with 'odometer-confirmations' in confirmation_image_url
UPDATE odometer_confirmations
SET confirmation_image_url = REPLACE(confirmation_image_url, 'odometer-readings', 'odometer-confirmations')
WHERE confirmation_image_url LIKE '%odometer-readings%';
