-- Test schema for SARS tables
-- H2 in PostgreSQL mode

CREATE TABLE sars_cost_scale_brackets (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    bracket_index INTEGER NOT NULL,
    min_vehicle_value_cents BIGINT NOT NULL,
    max_vehicle_value_cents BIGINT,
    fixed_cost_cents BIGINT NOT NULL,
    fuel_cost_tenths_cents_per_km BIGINT NOT NULL,
    maintenance_cost_tenths_cents_per_km BIGINT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sars_prescribed_rates (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL UNIQUE,
    rate_cents_per_km BIGINT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
