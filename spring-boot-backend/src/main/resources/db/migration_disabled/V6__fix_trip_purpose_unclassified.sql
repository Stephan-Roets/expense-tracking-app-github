-- ============================================
-- FIX TRIP PURPOSE ENUM - ADD UNCLASSIFIED
-- ============================================
-- This migration fixes the missing UNCLASSIFIED value in trip_purpose enum
-- V1 migration ran successfully but the value was not added (enum may have been recreated)

ALTER TYPE trip_purpose ADD VALUE 'UNCLASSIFIED';
