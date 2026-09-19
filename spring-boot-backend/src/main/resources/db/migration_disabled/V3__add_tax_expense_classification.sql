-- ============================================
-- TAX EXPENSE CLASSIFICATION MIGRATION
-- ============================================

-- Step 1: Create tax_expense_classification enum
CREATE TYPE tax_expense_classification AS ENUM (
    'QUALIFYING_CURRENT_EXPENSE',
    'CAPITAL_OR_ALLOWANCE_REVIEW',
    'PERSONAL_OR_NON_QUALIFYING',
    'UNCATEGORIZED'
);

-- Step 2: Add tax_expense_classification column to expenses table
ALTER TABLE expenses 
ADD COLUMN tax_expense_classification tax_expense_classification NOT NULL DEFAULT 'UNCATEGORIZED';

-- Step 3: Migrate existing expenses based on category
-- Only classify categories we are certain about
UPDATE expenses
SET tax_expense_classification = 'QUALIFYING_CURRENT_EXPENSE'
WHERE category IN ('FUEL_LOG', 'MAINTENANCE', 'MECHANIC_SERVICE', 'CAR_WASH', 'TYRES', 'MAINTENANCE_TOPUP');

-- Update insurance and licensing as qualifying
UPDATE expenses
SET tax_expense_classification = 'QUALIFYING_CURRENT_EXPENSE'
WHERE category IN ('INSURANCE_PREMIUM', 'VEHICLE_LEVY');

-- Fines are personal/non-qualifying
UPDATE expenses
SET tax_expense_classification = 'PERSONAL_OR_NON_QUALIFYING'
WHERE category = 'FINE';

-- All other categories remain UNCATEGORIZED for manual review
