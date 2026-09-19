-- ============================================
-- REPORT EXPORT TABLE MIGRATION
-- ============================================

-- Create report_export_status enum
CREATE TYPE report_export_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);

-- Create report_export table
CREATE TABLE report_export (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    requested_by_id UUID NOT NULL REFERENCES "user"(id),
    report_type VARCHAR(30) NOT NULL,
    format VARCHAR(10) NOT NULL,
    date_from TIMESTAMPTZ,
    date_to TIMESTAMPTZ,
    status report_export_status NOT NULL DEFAULT 'PENDING',
    file_url TEXT,
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_report_export_org ON report_export(organization_id);
CREATE INDEX idx_report_export_status ON report_export(status);
CREATE INDEX idx_report_export_type ON report_export(report_type);
