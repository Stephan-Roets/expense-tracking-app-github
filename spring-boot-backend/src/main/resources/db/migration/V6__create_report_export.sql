-- ============================================================================
-- REPORT EXPORT
-- ============================================================================

CREATE TABLE report_export (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL,
    format VARCHAR(10) NOT NULL,
    date_from TIMESTAMPTZ,
    date_to TIMESTAMPTZ,
    vehicle_id UUID,
    tax_year INTEGER,
    calculation_method VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    file_url TEXT,
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_export_org ON report_export(organization_id);
CREATE INDEX idx_report_export_status ON report_export(status);
CREATE INDEX idx_report_export_type ON report_export(report_type);
CREATE INDEX idx_report_export_vehicle ON report_export(vehicle_id);
