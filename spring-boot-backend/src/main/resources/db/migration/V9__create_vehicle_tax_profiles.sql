-- ============================================================================
-- VEHICLE TAX PROFILES
-- ============================================================================

CREATE TABLE vehicle_tax_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    vehicle_cost_cents BIGINT NOT NULL,
    date_placed_in_business_use DATE NOT NULL,
    taxpayer_vat_registered BOOLEAN NOT NULL DEFAULT false,
    taxpayer_type VARCHAR(20) NOT NULL,
    compensation_type VARCHAR(20) NOT NULL,
    fuel_borne_by VARCHAR(20) NOT NULL,
    maintenance_borne_by VARCHAR(20) NOT NULL,
    covered_by_maintenance_plan BOOLEAN NOT NULL DEFAULT false,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_tax_profiles_organization ON vehicle_tax_profiles(organization_id);
CREATE INDEX idx_vehicle_tax_profiles_vehicle ON vehicle_tax_profiles(vehicle_id);

-- Partial unique index: only one active profile per vehicle
CREATE UNIQUE INDEX uq_vehicle_tax_profile_active 
    ON vehicle_tax_profiles(vehicle_id) 
    WHERE effective_to IS NULL;
