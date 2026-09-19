-- ============================================
-- BACKFILL HISTORICAL EXPENSE CLASSIFICATION
-- ============================================
-- This migration backfills tax_expense_classification for existing expenses
-- based on their category to provide meaningful provisional Actual Costs estimates
-- Categories that are clearly qualifying current expenses are classified as such
-- Uncertain categories remain UNCATEGORIZED for manual review

-- Classify known qualifying current expenses
UPDATE expenses
SET tax_expense_classification = 'QUALIFYING_CURRENT_EXPENSE'
WHERE category IN (
    'FUEL_LOG',
    'MAINTENANCE_TOPUP',
    'MECHANIC_SERVICE',
    'CAR_WASH',
    'TIRES',
    'INSURANCE_PREMIUM',
    'VEHICLE_TRACKING',
    'LICENSE_RENEWAL',
    'ROADWORTHY'
);

-- Classify known personal/non-qualifying expenses
UPDATE expenses
SET tax_expense_classification = 'PERSONAL_OR_NON_QUALIFYING'
WHERE category = 'PERSONAL_LICENSE';

-- Note: ETOLL_SANRAL and OTHER_FIXED remain UNCATEGORIZED
-- as they require manual review for tax purposes
