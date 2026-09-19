-- ============================================================================
-- TAX CALCULATION SNAPSHOT
-- ============================================================================

CREATE TABLE tax_calculation_snapshot (
    id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    tax_year INTEGER NOT NULL,
    selected_method VARCHAR(30) NOT NULL,
    inputs_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    sars_rate_snapshot_json TEXT NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    calculated_by_user_id UUID NOT NULL,
    export_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    PRIMARY KEY (id)
);

CREATE INDEX idx_snapshot_vehicle ON tax_calculation_snapshot(vehicle_id);
CREATE INDEX idx_snapshot_organization ON tax_calculation_snapshot(organization_id);
CREATE INDEX idx_snapshot_tax_year ON tax_calculation_snapshot(tax_year);
CREATE INDEX idx_snapshot_export ON tax_calculation_snapshot(export_id);
CREATE INDEX idx_snapshot_calculated_at ON tax_calculation_snapshot(calculated_at);
