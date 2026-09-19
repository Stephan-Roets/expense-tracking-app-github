-- Test seed data for SARS cost scale brackets
-- Uses exclusive bounds (max = SARS upper limit + 1 cent)

-- 2026 brackets
INSERT INTO sars_cost_scale_brackets (tax_year, bracket_index, min_vehicle_value_cents, max_vehicle_value_cents, fixed_cost_cents, fuel_cost_tenths_cents_per_km, maintenance_cost_tenths_cents_per_km, source_name, source_url, published_at) VALUES
(2026, 0, 0, 10000001, 3394000, 1467, 474, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 1, 10000001, 20000001, 6068800, 1638, 593, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 2, 20000001, 30000001, 8749700, 1779, 654, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 3, 30000001, 40000001, 11127300, 1914, 714, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 4, 40000001, 50000001, 13504800, 2048, 839, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 5, 50000001, 60000001, 15993400, 2349, 985, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 6, 60000001, 70000001, 18486700, 2389, 1105, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 7, 70000001, 80000001, 21112100, 2429, 1225, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00'),
(2026, 8, 80000001, NULL, 21112100, 2429, 1225, 'SARS Travel Allowance 2025/26', 'https://www.sars.gov.za/', '2025-02-28 00:00:00');

-- 2027 brackets
INSERT INTO sars_cost_scale_brackets (tax_year, bracket_index, min_vehicle_value_cents, max_vehicle_value_cents, fixed_cost_cents, fuel_cost_tenths_cents_per_km, maintenance_cost_tenths_cents_per_km, source_name, source_url, published_at) VALUES
(2027, 0, 0, 11500001, 3834400, 1329, 491, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 1, 11500001, 23000001, 6848700, 1484, 614, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 2, 23000001, 34500001, 9868900, 1612, 678, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 3, 34500001, 46000001, 12539300, 1734, 740, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 4, 46000001, 57500001, 15209700, 1855, 869, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 5, 57500001, 69000001, 18007800, 2128, 1020, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 6, 69000001, 80500001, 20810600, 2165, 1145, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 7, 80500001, 92000001, 23767900, 2201, 1269, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00'),
(2027, 8, 92000001, NULL, 23767900, 2201, 1269, 'SARS Travel Allowance 2026/27', 'https://www.sars.gov.za/', '2026-02-25 00:00:00');
