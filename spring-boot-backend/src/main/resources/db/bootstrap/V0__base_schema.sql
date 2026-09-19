-- ============================================================================
-- VEHICLE EXPENSE & TAX COMPLIANCE SYSTEM - PostgreSQL 16 Schema
-- South African ZAR Currency | SARS Logbook Compliant
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'DRIVER');
CREATE TYPE organization_mode AS ENUM ('SOLO', 'FLEET');
CREATE TYPE fuel_type AS ENUM (
    'DIESEL_10PPM', 'DIESEL_50PPM', 'DIESEL_500PPM',
    'PETROL_UNLEADED_93', 'PETROL_UNLEADED_95'
);
CREATE TYPE expense_category AS ENUM (
    'FUEL_LOG', 'MECHANIC_SERVICE', 'MAINTENANCE_TOPUP', 'TIRES', 'CAR_WASH',
    'INSURANCE_PREMIUM', 'VEHICLE_TRACKING', 'ETOLL_SANRAL', 'LICENSE_RENEWAL',
    'PERSONAL_LICENSE', 'ROADWORTHY', 'OTHER_FIXED'
);
CREATE TYPE maintenance_item_type AS ENUM (
    'ENGINE_OIL', 'BRAKE_FLUID', 'ANTIFREEZE', 'BATTERY', 'FUSES',
    'RELAYS', 'WIPER_BLADES', 'LIGHT_BULBS', 'OTHER'
);
CREATE TYPE car_wash_type AS ENUM ('WASH_AND_GO', 'FULL_VALET', 'ENGINE_STEAM_CLEAN');
CREATE TYPE drivetrain_type AS ENUM ('FWD', 'RWD', 'AWD', 'FOUR_BY_FOUR');
CREATE TYPE service_type AS ENUM (
    'MAJOR_SERVICE', 'MINOR_SERVICE', 'BRAKE_OVERHAUL', 'ENGINE_REPAIR',
    'TRANSMISSION', 'SUSPENSION', 'ELECTRICAL', 'AIR_CONDITIONING',
    'WINDSCREEN_GLASS', 'OTHER'
);
CREATE TYPE trip_purpose AS ENUM ('BUSINESS', 'PRIVATE');
CREATE TYPE vehicle_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED');
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED');
CREATE TYPE odometer_reading_type AS ENUM ('OPENING', 'CLOSING');
CREATE TYPE insurance_policy_type AS ENUM ('COMPREHENSIVE', 'THIRD_PARTY', 'THIRD_PARTY_FIRE_THEFT');
CREATE TYPE tracking_subscription_type AS ENUM ('MONTHLY', 'ANNUAL', 'ONCE_OFF');
CREATE TYPE etoll_payment_method AS ENUM ('ETAG', 'VIOLATION', 'ALTERNATE_ROUTE', 'MONTHLY_PASS');
CREATE TYPE license_type AS ENUM ('VEHICLE_LICENSE', 'DRIVERS_LICENSE', 'PDP', 'OPERATING_LICENSE');
CREATE TYPE personal_license_type AS ENUM ('DRIVERS_LICENSE', 'PERSONAL_ID_CARD', 'PDP');
CREATE TYPE license_renewal_method AS ENUM ('ONLINE', 'POST_OFFICE', 'LICENSING_DEPT', 'AGENT', 'DLTC', 'DRIVING_SCHOOL', 'HOME_AFFAIRS', 'BANK');
CREATE TYPE roadworthy_result AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS');
CREATE TYPE recurrence_frequency AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONCE_OFF');
CREATE TYPE tyre_rotation_status AS ENUM ('OK', 'UPCOMING', 'WARNING', 'CRITICAL');
CREATE TYPE expiry_status AS ENUM ('VALID', 'UPCOMING', 'WARNING', 'CRITICAL', 'EXPIRED');
CREATE TYPE expiry_item_type AS ENUM (
    'VEHICLE_LICENSE', 'DRIVERS_LICENSE', 'PDP', 'PERSONAL_ID_CARD',
    'INSURANCE', 'TRACKING_CONTRACT', 'ROADWORTHY', 'OPERATING_LICENSE',
    'MECHANIC_SERVICE'  -- Service intervals (km/date based)
);
CREATE TYPE entry_type AS ENUM ('VEHICLE', 'EXPENSE', 'TRIP', 'ODOMETER_VERIFICATION');
CREATE TYPE image_type AS ENUM ('RECEIPT', 'ODOMETER', 'ATTACHMENT', 'DAMAGE');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'SOLO',
    tax_number VARCHAR(50),
    vat_number VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL DEFAULT 'South Africa',
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    logo_url TEXT,
    condition_report_enabled BOOLEAN NOT NULL DEFAULT false,
    odometer_confirmation_enabled BOOLEAN NOT NULL DEFAULT false,
    owner_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'DRIVER',
    phone VARCHAR(50),
    employee_number VARCHAR(50),
    drivers_license_number VARCHAR(50),
    drivers_license_expiry DATE,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token VARCHAR(255),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    password_changed BOOLEAN NOT NULL DEFAULT false,
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    registration_number VARCHAR(20) NOT NULL,
    vin VARCHAR(50),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    nickname VARCHAR(100),
    color VARCHAR(50),
    fuel_type fuel_type NOT NULL,
    tank_capacity_liters DECIMAL(6,2),
    current_odometer INTEGER NOT NULL DEFAULT 0,
    drivetrain_type drivetrain_type,
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    license_expiry DATE,
    insurance_policy_number VARCHAR(100),
    tracker_serial VARCHAR(100),
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, registration_number)
);

CREATE INDEX idx_vehicles_organization ON vehicles(organization_id);
CREATE INDEX idx_vehicles_driver ON vehicles(assigned_driver_id);

-- ============================================================================
-- EXPENSE TABLES
-- ============================================================================

-- Main Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    category expense_category NOT NULL,
    expense_date DATE NOT NULL,
    amount_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_amount_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    receipt_image_url TEXT,
    receipt_image_key VARCHAR(255),
    odometer_reading INTEGER,
    supplier_name VARCHAR(255),
    invoice_number VARCHAR(100),
    is_tax_deductible BOOLEAN NOT NULL DEFAULT true,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_organization ON expenses(organization_id);
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- Fuel Logs
CREATE TABLE fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    fuel_type fuel_type NOT NULL,
    liters DECIMAL(8,3) NOT NULL,
    price_per_liter DECIMAL(8,4) NOT NULL,
    full_tank BOOLEAN NOT NULL DEFAULT false,
    station_name VARCHAR(255),
    station_location VARCHAR(255),
    previous_odometer INTEGER,
    km_since_last_fill INTEGER,
    efficiency_km_per_liter DECIMAL(6,2),
    is_baseline_fill BOOLEAN DEFAULT false,
    consumption_l_per_100km DECIMAL(6,2),
    consumption_calculated_at TIMESTAMPTZ,
    consumption_notes TEXT,
    gps_latitude DECIMAL(10,8),
    gps_longitude DECIMAL(11,8),
    gps_accuracy_meters DECIMAL(8,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Car Washes
CREATE TABLE car_washes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    wash_type car_wash_type NOT NULL,
    wash_name VARCHAR(255),
    wash_location VARCHAR(255),
    interior_cleaned BOOLEAN DEFAULT false,
    exterior_cleaned BOOLEAN DEFAULT true,
    engine_cleaned BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mechanic Services
CREATE TABLE mechanic_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    service_type service_type NOT NULL,
    workshop_name VARCHAR(255) NOT NULL,
    workshop_phone VARCHAR(50),
    workshop_address TEXT,
    technician_name VARCHAR(100),
    labor_cost_zar DECIMAL(12,2),
    parts_cost_zar DECIMAL(12,2),
    work_description TEXT,
    parts_replaced TEXT,
    warranty_months INTEGER,
    next_service_due_km INTEGER,
    next_service_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance Top-ups
CREATE TABLE maintenance_topups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    item_type maintenance_item_type NOT NULL,
    item_brand VARCHAR(100),
    item_quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
    item_unit VARCHAR(50),
    shop_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tyres
CREATE TABLE tyres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    size VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    position VARCHAR(50),
    purchase_odometer INTEGER NOT NULL,
    tread_depth_mm DECIMAL(4,1),
    expected_lifespan_km INTEGER,
    rotation_interval_km INTEGER NOT NULL DEFAULT 8000,
    last_rotation_odometer INTEGER,
    warranty_km INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insurance Premiums
CREATE TABLE insurance_premiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    insurer_name VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    policy_type insurance_policy_type NOT NULL,
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE NOT NULL,
    monthly_premium_zar DECIMAL(12,2) NOT NULL,
    excess_amount_zar DECIMAL(12,2),
    broker_name VARCHAR(255),
    broker_phone VARCHAR(50),
    claim_phone_number VARCHAR(50),
    cover_details TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicle Tracking
CREATE TABLE vehicle_trackings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    provider_name VARCHAR(255) NOT NULL,
    subscription_type tracking_subscription_type NOT NULL,
    monthly_fee_zar DECIMAL(12,2) NOT NULL,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    device_serial_number VARCHAR(100),
    device_type VARCHAR(100),
    installation_date DATE,
    recovery_included BOOLEAN NOT NULL DEFAULT false,
    app_login_email VARCHAR(255),
    support_phone_number VARCHAR(50),
    features TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E-Tolls (SANRAL)
CREATE TABLE etoll_sanrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    account_number VARCHAR(100),
    tag_serial_number VARCHAR(100),
    vehicle_registration VARCHAR(20) NOT NULL,
    payment_method etoll_payment_method NOT NULL,
    toll_routes TEXT,
    period_start_date DATE,
    period_end_date DATE,
    total_gantries INTEGER,
    total_amount_zar DECIMAL(12,2) NOT NULL,
    vat_amount_zar DECIMAL(12,2),
    reference_number VARCHAR(100),
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- License Renewals (Vehicle)
CREATE TABLE license_renewals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    license_type license_type NOT NULL,
    license_number VARCHAR(100),
    registration_authority VARCHAR(255),
    previous_expiry_date DATE,
    new_expiry_date DATE NOT NULL,
    renewal_fee_zar DECIMAL(12,2) NOT NULL,
    penalties_zar DECIMAL(12,2),
    arrears_zar DECIMAL(12,2),
    transaction_number VARCHAR(100),
    renewal_method license_renewal_method NOT NULL,
    processing_days INTEGER,
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Personal License Renewals (Driver's License, ID Card, PDP)
CREATE TABLE personal_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    license_type personal_license_type NOT NULL,
    -- Driver's License fields
    license_number VARCHAR(100),
    license_code VARCHAR(10),
    -- ID Card fields
    id_number VARCHAR(13),
    -- PDP fields
    pdp_number VARCHAR(100),
    pdp_category VARCHAR(10),
    -- Common fields
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    renewal_fee_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    penalties_zar DECIMAL(12,2),
    renewal_method license_renewal_method,
    dlc_name VARCHAR(255),
    dlc_address TEXT,
    home_affairs_office VARCHAR(255),
    application_number VARCHAR(100),
    collection_date DATE,
    eye_test_date DATE,
    medical_exam_date DATE,
    medical_exam_valid BOOLEAN DEFAULT true,
    training_provider VARCHAR(255),
    document_image_url TEXT,
    document_image_key VARCHAR(255),
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_personal_licenses_user ON personal_licenses(user_id);
CREATE INDEX idx_personal_licenses_expiry ON personal_licenses(expiry_date);
CREATE INDEX idx_personal_licenses_type ON personal_licenses(license_type);

-- Roadworthy Certificates
CREATE TABLE roadworthy_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    testing_station_name VARCHAR(255) NOT NULL,
    testing_station_address TEXT,
    testing_station_phone VARCHAR(50),
    test_date DATE NOT NULL,
    certificate_number VARCHAR(100),
    expiry_date DATE,
    test_result roadworthy_result NOT NULL,
    test_fee_zar DECIMAL(12,2) NOT NULL,
    retest_fee_zar DECIMAL(12,2),
    inspector_name VARCHAR(100),
    vehicle_odometer INTEGER,
    failure_reasons TEXT,
    conditions_applied TEXT,
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Other Fixed Expenses
CREATE TABLE other_fixed_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
    expense_description TEXT NOT NULL,
    category_label VARCHAR(100),
    provider_name VARCHAR(255),
    reference_number VARCHAR(100),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_frequency recurrence_frequency,
    period_start_date DATE,
    period_end_date DATE,
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRIP & LOGBOOK TABLES
-- ============================================================================

-- Trips
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    trip_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    start_odometer INTEGER NOT NULL,
    end_odometer INTEGER NOT NULL,
    distance_km INTEGER,
    purpose trip_purpose NOT NULL,
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255) NOT NULL,
    route_description TEXT,
    customer_client_name VARCHAR(255),
    reason_for_trip TEXT,
    toll_costs_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    parking_costs_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_odometer CHECK (end_odometer >= start_odometer)
);

CREATE INDEX idx_trips_organization ON trips(organization_id);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_date ON trips(trip_date);
CREATE INDEX idx_trips_purpose ON trips(purpose);

-- Tax Year Summaries
CREATE TABLE tax_year_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    tax_year INTEGER NOT NULL,
    total_km INTEGER NOT NULL DEFAULT 0,
    business_km INTEGER NOT NULL DEFAULT 0,
    private_km INTEGER NOT NULL DEFAULT 0,
    business_percentage DECIMAL(5,2),
    total_expenses_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    fuel_expenses_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    maintenance_expenses_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    fixed_expenses_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    opening_odometer INTEGER,
    closing_odometer INTEGER,
    last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(vehicle_id, tax_year)
);

-- Odometer Verifications
CREATE TABLE odometer_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    tax_year INTEGER NOT NULL,
    reading_type odometer_reading_type NOT NULL,
    odometer_value INTEGER NOT NULL,
    image_url_avif TEXT,  -- Optional: photo recommended but not required for SARS compliance
    image_key VARCHAR(255),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gps_latitude DECIMAL(10,8),
    gps_longitude DECIMAL(11,8),
    gps_accuracy_meters DECIMAL(8,2),
    device_info TEXT,
    ip_address INET,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_odometer_verifications_vehicle ON odometer_verifications(vehicle_id);
CREATE INDEX idx_odometer_verifications_tax_year ON odometer_verifications(tax_year);

-- ============================================================================
-- TYRE ROTATION TRACKING
-- ============================================================================

CREATE TABLE tyre_rotation_trackings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    tyre_expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    drivetrain_type drivetrain_type NOT NULL,
    rotation_interval_km INTEGER NOT NULL DEFAULT 8000,
    installation_odometer INTEGER NOT NULL,
    last_rotation_odometer INTEGER,
    last_rotation_date DATE,
    rotation_count INTEGER NOT NULL DEFAULT 0,
    next_rotation_odometer INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    dismissed_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tyre_rotation_vehicle ON tyre_rotation_trackings(vehicle_id);
CREATE INDEX idx_tyre_rotation_active ON tyre_rotation_trackings(is_active);

-- Tyre Rotation History
CREATE TABLE tyre_rotation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id UUID NOT NULL REFERENCES tyre_rotation_trackings(id) ON DELETE CASCADE,
    rotation_date DATE NOT NULL,
    rotation_odometer INTEGER NOT NULL,
    rotation_pattern VARCHAR(50),
    performed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXPIRY ALERTS
-- ============================================================================

CREATE TABLE expiry_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_type expiry_item_type NOT NULL,
    item_id UUID NOT NULL,
    related_id UUID,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expiry_date DATE NOT NULL,
    days_until_expiry INTEGER,
    expiry_status expiry_status,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    dismissed_by_user_id UUID REFERENCES users(id),
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expiry_alerts_organization ON expiry_alerts(organization_id);
CREATE INDEX idx_expiry_alerts_type ON expiry_alerts(item_type);
CREATE INDEX idx_expiry_alerts_expiry ON expiry_alerts(expiry_date);
CREATE INDEX idx_expiry_alerts_status ON expiry_alerts(expiry_status);

-- ============================================================================
-- ENTRY IMAGES
-- ============================================================================

CREATE TABLE entry_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entry_type entry_type NOT NULL,
    entry_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    image_key VARCHAR(255),
    image_type image_type NOT NULL,
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by_user_id UUID REFERENCES users(id),
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    locked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entry_images_entry ON entry_images(entry_type, entry_id);

-- ============================================================================
-- VEHICLE FUEL CONSUMPTION STATS (Materialized View)
-- ============================================================================

CREATE TABLE vehicle_fuel_consumption_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
    total_fuel_logs INTEGER NOT NULL DEFAULT 0,
    total_full_tank_fills INTEGER NOT NULL DEFAULT 0,
    total_liters DECIMAL(12,3) NOT NULL DEFAULT 0,
    total_distance_km INTEGER NOT NULL DEFAULT 0,
    total_fuel_cost_zar DECIMAL(12,2) NOT NULL DEFAULT 0,
    average_consumption_l_per_100km DECIMAL(6,2),
    best_consumption_l_per_100km DECIMAL(6,2),
    worst_consumption_l_per_100km DECIMAL(6,2),
    recent_average_consumption_l_per_100km DECIMAL(6,2),
    last_fill_odometer INTEGER,
    last_fill_date DATE,
    last_fill_full_tank BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- REFRESH TOKENS
-- ============================================================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    device_info TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personal_licenses_updated_at BEFORE UPDATE ON personal_licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expiry_alerts_updated_at BEFORE UPDATE ON expiry_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update vehicle odometer from expense
CREATE OR REPLACE FUNCTION update_vehicle_odometer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.odometer_reading IS NOT NULL THEN
        UPDATE vehicles
        SET current_odometer = NEW.odometer_reading,
            updated_at = NOW()
        WHERE id = NEW.vehicle_id
          AND current_odometer < NEW.odometer_reading;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_update_vehicle_odometer
    AFTER INSERT OR UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_vehicle_odometer();

-- Function to create expiry alert for personal license
CREATE OR REPLACE FUNCTION create_personal_license_expiry_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing alert for this license
    DELETE FROM expiry_alerts
    WHERE item_type = NEW.license_type::text::expiry_item_type
      AND item_id = NEW.id;

    -- Create new alert
    INSERT INTO expiry_alerts (
        organization_id, item_type, item_id, item_name,
        item_description, user_id, expiry_date
    ) VALUES (
        NEW.organization_id,
        CASE NEW.license_type
            WHEN 'DRIVERS_LICENSE' THEN 'DRIVERS_LICENSE'::expiry_item_type
            WHEN 'PERSONAL_ID_CARD' THEN 'PERSONAL_ID_CARD'::expiry_item_type
            WHEN 'PDP' THEN 'PDP'::expiry_item_type
        END,
        NEW.id,
        CASE NEW.license_type
            WHEN 'DRIVERS_LICENSE' THEN 'Driver''s License'
            WHEN 'PERSONAL_ID_CARD' THEN 'ID Card'
            WHEN 'PDP' THEN 'PDP'
        END,
        COALESCE(NEW.license_number, NEW.id_number, NEW.pdp_number),
        NEW.user_id,
        NEW.expiry_date
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER personal_license_expiry_alert
    AFTER INSERT OR UPDATE ON personal_licenses
    FOR EACH ROW EXECUTE FUNCTION create_personal_license_expiry_alert();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Expenses with full details view
CREATE OR REPLACE VIEW v_expenses_with_details AS
SELECT
    e.*,
    v.registration_number AS vehicle_reg,
    v.make || ' ' || v.model AS vehicle_name,
    u.first_name || ' ' || u.last_name AS user_name,
    lu.first_name || ' ' || lu.last_name AS locked_by_name,
    (SELECT COUNT(*) FROM entry_images WHERE entry_type = 'EXPENSE' AND entry_id = e.id) AS image_count
FROM expenses e
JOIN vehicles v ON e.vehicle_id = v.id
JOIN users u ON e.user_id = u.id
LEFT JOIN users lu ON e.locked_by_user_id = lu.id;

-- Trips with vehicle details view
CREATE OR REPLACE VIEW v_trips_with_details AS
SELECT
    t.*,
    v.registration_number AS vehicle_reg,
    v.make || ' ' || v.model AS vehicle_name,
    u.first_name || ' ' || u.last_name AS user_name,
    lu.first_name || ' ' || lu.last_name AS locked_by_name,
    (SELECT COUNT(*) FROM entry_images WHERE entry_type = 'TRIP' AND entry_id = t.id) AS image_count
FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
JOIN users u ON t.user_id = u.id
LEFT JOIN users lu ON t.locked_by_user_id = lu.id;

-- Tyre rotation warnings view
CREATE OR REPLACE VIEW v_tyre_rotation_warnings AS
SELECT
    trt.id AS tracking_id,
    trt.organization_id,
    trt.vehicle_id,
    v.registration_number AS vehicle_registration,
    v.make || ' ' || v.model AS vehicle_name,
    ty.brand AS tyre_brand,
    ty.model AS tyre_model,
    ty.size AS tyre_size,
    e.expense_date AS installation_date,
    trt.drivetrain_type,
    trt.rotation_interval_km,
    trt.installation_odometer,
    trt.last_rotation_odometer,
    trt.last_rotation_date,
    trt.rotation_count,
    trt.next_rotation_odometer,
    v.current_odometer AS current_vehicle_odometer,
    (SELECT fe.odometer_reading FROM fuel_logs fl
     JOIN expenses fe ON fl.expense_id = fe.id
     WHERE fe.vehicle_id = v.id
     ORDER BY fe.expense_date DESC LIMIT 1) AS latest_fuel_odometer,
    GREATEST(0, v.current_odometer - trt.next_rotation_odometer) AS km_overdue,
    CASE
        WHEN v.current_odometer >= trt.next_rotation_odometer + 1000 THEN 'CRITICAL'
        WHEN v.current_odometer >= trt.next_rotation_odometer THEN 'WARNING'
        WHEN v.current_odometer >= trt.next_rotation_odometer - 1000 THEN 'UPCOMING'
        ELSE 'OK'
    END::tyre_rotation_status AS rotation_status,
    trt.is_active,
    trt.is_dismissed
FROM tyre_rotation_trackings trt
JOIN vehicles v ON trt.vehicle_id = v.id
JOIN expenses e ON trt.tyre_expense_id = e.id
JOIN tyres ty ON e.id = ty.expense_id
WHERE trt.is_active = true AND trt.is_dismissed = false;

-- Active expiry alerts view
CREATE OR REPLACE VIEW v_active_expiry_alerts AS
SELECT
    ea.*,
    v.registration_number AS vehicle_registration,
    v.make || ' ' || v.model AS vehicle_name,
    u.first_name || ' ' || u.last_name AS user_name
FROM expiry_alerts ea
LEFT JOIN vehicles v ON ea.vehicle_id = v.id
LEFT JOIN users u ON ea.user_id = u.id
WHERE ea.is_dismissed = false
  AND ea.expiry_status IN ('EXPIRED', 'CRITICAL', 'WARNING', 'UPCOMING')
ORDER BY ea.expiry_date ASC;

-- Trip Summary View
-- Provides aggregated trip statistics for dashboard and reporting
-- Can be filtered by vehicle_id using WHERE clause
CREATE OR REPLACE VIEW v_trip_summary AS
SELECT
    vehicle_id,
    COUNT(*) AS total_trips,
    SUM(CASE WHEN purpose = 'BUSINESS' THEN 1 ELSE 0 END) AS business_trips,
    SUM(CASE WHEN purpose = 'PRIVATE' THEN 1 ELSE 0 END) AS private_trips,
    COALESCE(SUM(distance_km), 0) AS total_km,
    COALESCE(SUM(CASE WHEN purpose = 'BUSINESS' THEN distance_km ELSE 0 END), 0) AS business_km,
    COALESCE(SUM(CASE WHEN purpose = 'PRIVATE' THEN distance_km ELSE 0 END), 0) AS private_km,
    CASE
        WHEN COALESCE(SUM(distance_km), 0) > 0
        THEN ROUND((COALESCE(SUM(CASE WHEN purpose = 'BUSINESS' THEN distance_km ELSE 0 END), 0)::NUMERIC / COALESCE(SUM(distance_km), 0) * 100), 0)
        ELSE 0
    END AS business_percentage
FROM trips
GROUP BY vehicle_id;

-- Performance Indexes for Trips Table
-- These indexes improve query performance for common patterns

-- Composite index for vehicle + date queries (common in dashboard)
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_date ON trips(vehicle_id, trip_date DESC);

-- Composite index for organization + purpose queries (SARS reporting)
CREATE INDEX IF NOT EXISTS idx_trips_org_purpose ON trips(organization_id, purpose);

-- Composite index for user + date queries (driver trip history)
CREATE INDEX IF NOT EXISTS idx_trips_user_date ON trips(user_id, trip_date DESC);

-- Index for locked trips (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_trips_locked ON trips(is_locked) WHERE is_locked = true;

-- ============================================================================
-- SAMPLE DATA (Optional - for development/testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
INSERT INTO organizations (id, name, mode) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Demo Fleet Company', 'FLEET');

INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
     'admin@demo.com', '$2a$10$demohashdemohashdemohas', 'Admin', 'User', 'ADMIN');
*/
