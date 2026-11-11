INSERT OR IGNORE INTO units (id, actual_unit_number, floor, type, sqm, monthly_rent_centavos, commercial_priority, status, created_at, updated_at) VALUES
('BR·02', 'U-1002', 10, 'Standard Studio', 24, 2500000, 'HIGH', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·03', 'U-1003', 10, 'Standard Studio', 24, 2500000, 'HIGH', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·04', 'U-1004', 10, 'Executive Studio', 42, 2500000, 'LOW', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·05', 'U-1005', 10, 'Standard Studio', 24, 2500000, 'HIGH', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·07', 'U-1007', 10, 'Standard Studio', 24, 2500000, 'HIGH', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·08', 'U-1008', 10, 'Standard Studio', 24, 2500000, 'HIGH', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·09', 'U-1009', 10, 'Standard Studio', 24, 2500000, 'HIGH', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·10', 'U-1010', 10, 'Standard Studio', 24, 2500000, 'HIGH', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·27', 'U-2704B', 27, 'Standard Studio', 29, 2500000, 'LOW', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z'),
('BR·32', 'U-3208', 32, 'Standard Studio', 31, 2500000, 'LOW', 'AVAILABLE', '2026-10-05T00:00:00Z', '2026-10-05T00:00:00Z');

INSERT OR IGNORE INTO unit_features (unit_id, feature_key, feature_value) VALUES
('BR·02', 'balcony', 'true'), ('BR·02', 'view', 'true'), ('BR·02', 'tv_inches', '32'),
('BR·03', 'balcony', 'true'), ('BR·03', 'view', 'true'), ('BR·03', 'tv_inches', '32'),
('BR·04', 'balcony', 'true'), ('BR·04', 'view', 'true'), ('BR·04', 'queen_bed', 'true'), ('BR·04', 'sofa_bed', 'true'), ('BR·04', 'tv_inches', '43'),
('BR·05', 'balcony', 'true'), ('BR·05', 'view', 'true'), ('BR·05', 'tv_inches', '32'),
('BR·07', 'balcony', 'true'), ('BR·07', 'view', 'false'), ('BR·07', 'quiet_side', 'true'), ('BR·07', 'tv_inches', '32'),
('BR·08', 'balcony', 'true'), ('BR·08', 'view', 'true'), ('BR·08', 'tv_inches', '43'),
('BR·09', 'balcony', 'true'), ('BR·09', 'view', 'false'), ('BR·09', 'quiet_side', 'true'), ('BR·09', 'tv_inches', '43'),
('BR·10', 'balcony', 'true'), ('BR·10', 'view', 'true'), ('BR·10', 'tv_inches', '32'),
('BR·27', 'balcony', 'true'), ('BR·27', 'panoramic_view', 'true'), ('BR·27', 'queen_bed', 'true'), ('BR·27', 'sofa_bed', 'true'), ('BR·27', 'tv_inches', '43'),
('BR·32', 'balcony', 'true'), ('BR·32', 'veranda', 'true'), ('BR·32', 'panoramic_view', 'true'), ('BR·32', 'tv_inches', '43');
