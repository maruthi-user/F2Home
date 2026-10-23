-- ============================================================
-- V7: farmer farm pin + delivery reach
--
-- Each farmer sets their own farm location and how far (and which days)
-- they deliver, instead of every farmer sharing one platform-wide radius.
-- Nullable: existing farmers fall back to the configured default radius
-- (f2home.marketplace.nearby-radius-km) until they set their own - see
-- FarmProfileService / ProductService.
-- ============================================================

ALTER TABLE f2home_users
    ADD COLUMN farm_lat DOUBLE PRECISION,
    ADD COLUMN farm_lng DOUBLE PRECISION,
    ADD COLUMN farm_location_label VARCHAR(255),
    ADD COLUMN delivery_radius_km DOUBLE PRECISION,
    ADD COLUMN delivery_days VARCHAR(50);
