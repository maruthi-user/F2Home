-- ============================================================
-- V3: registration profile data (name, village, photo) and the
--     permanent removal of the DELIVERY_PARTNER role
-- ============================================================

-- 1) Profile columns on the user table. The photo is stored as bytes
--    (Postgres bytea), same as product media - no filesystem needed.
ALTER TABLE f2home_users
    ADD COLUMN village            VARCHAR(120),
    ADD COLUMN photo_content_type VARCHAR(100),
    ADD COLUMN photo_bytes        BYTEA,
    ADD COLUMN photo_size_bytes   BIGINT;

-- 2) DELIVERY_PARTNER is removed permanently. Existing delivery-partner
--    accounts are remapped to CUSTOMER first so the check constraint can
--    be tightened without failing.
UPDATE f2home_users
   SET role = 'CUSTOMER'
 WHERE role = 'DELIVERY_PARTNER';

ALTER TABLE f2home_users DROP CONSTRAINT ck_f2home_users_role;
ALTER TABLE f2home_users
    ADD CONSTRAINT ck_f2home_users_role
    CHECK (role IN ('CUSTOMER', 'FARMER', 'ADMIN'));

-- 3) Registration drafts: everything collected before the OTP is sent
--    (name, village, role, self-taken photo) is parked here keyed by the
--    phone number and consumed when the OTP is verified, which is when the
--    account row is finally created.
CREATE TABLE f2home_registration_drafts (
    phone_number       VARCHAR(20)  PRIMARY KEY,
    full_name          VARCHAR(255) NOT NULL,
    village            VARCHAR(120) NOT NULL,
    role               VARCHAR(255) NOT NULL,
    photo_content_type VARCHAR(100) NOT NULL,
    photo_bytes        BYTEA        NOT NULL,
    photo_size_bytes   BIGINT       NOT NULL,
    created_at         TIMESTAMP,
    CONSTRAINT ck_f2home_registration_drafts_role
        CHECK (role IN ('CUSTOMER', 'FARMER'))
);

CREATE INDEX idx_f2home_registration_drafts_created_at
    ON f2home_registration_drafts (created_at);
