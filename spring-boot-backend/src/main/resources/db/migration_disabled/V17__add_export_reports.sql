-- ============================================
-- EXPORT REPORTS MIGRATION
-- ============================================

-- Create export_report_type enum
CREATE TYPE export_report_type AS ENUM (
    'FLEET_SUMMARY',
    'EXPENSE_REPORT',
    'TRIP_LOG',
    'ODOMETER_DRIFT',
    'VEHICLE_CONDITION'
);

-- Create export_report_format enum
CREATE TYPE export_report_format AS ENUM (
    'PDF',
    'EXCEL',
    'CSV'
);

-- Create export_reports table
CREATE TABLE export_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    requested_by_id UUID NOT NULL REFERENCES "user"(id),
    report_type export_report_type NOT NULL,
    report_format export_report_format NOT NULL,
    date_from TIMESTAMPTZ,
    date_to TIMESTAMPTZ,
    vehicle_ids TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size_bytes BIGINT,
    download_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_export_reports_organization ON export_reports(organization_id);
CREATE INDEX idx_export_reports_status ON export_reports(status);
CREATE INDEX idx_export_reports_type ON export_reports(report_type);
CREATE INDEX idx_export_reports_requested_by ON export_reports(requested_by_id);
