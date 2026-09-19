-- ============================================
-- CREATE TRIP PURPOSE ENUM
-- ============================================

-- Create the trip_purpose enum type with all required values
CREATE TYPE trip_purpose AS ENUM (
    'BUSINESS',
    'PERSONAL',
    'COMMUTE',
    'UNCLASSIFIED'
);
