-- ============================================================
-- V6: farmer approval gate
--
-- New farmer accounts start PENDING_APPROVAL instead of ACTIVE and stay
-- hidden from the marketplace until an admin approves them (see
-- AdminFarmerService). Customers are unaffected - they still get ACTIVE
-- straight from registration.
-- ============================================================

ALTER TABLE f2home_users DROP CONSTRAINT ck_f2home_users_status;
ALTER TABLE f2home_users ADD CONSTRAINT ck_f2home_users_status
    CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'INACTIVE'));
