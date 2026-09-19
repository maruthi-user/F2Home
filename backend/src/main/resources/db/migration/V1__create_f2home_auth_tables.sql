-- ============================================================
-- V1: F2HOME auth tables (users, refresh tokens, OTP verifications)
-- ============================================================

CREATE TABLE f2home_users (
    id              BIGSERIAL PRIMARY KEY,
    phone_number    VARCHAR(20)  NOT NULL,
    email           VARCHAR(255),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(255) NOT NULL,
    status          VARCHAR(255) NOT NULL,
    phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    full_name       VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    last_login_at   TIMESTAMP,
    CONSTRAINT uq_f2home_users_phone_number UNIQUE (phone_number),
    CONSTRAINT ck_f2home_users_role CHECK (role IN ('CUSTOMER', 'FARMER', 'DELIVERY_PARTNER', 'ADMIN')),
    CONSTRAINT ck_f2home_users_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE f2home_refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP,
    CONSTRAINT fk_f2home_refresh_tokens_user FOREIGN KEY (user_id)
        REFERENCES f2home_users (id) ON DELETE CASCADE,
    CONSTRAINT uq_f2home_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_f2home_refresh_tokens_user_id ON f2home_refresh_tokens (user_id);

CREATE TABLE f2home_otp_verifications (
    id           BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20)  NOT NULL,
    otp_hash     VARCHAR(255) NOT NULL,
    purpose      VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMP    NOT NULL,
    attempts     INT          NOT NULL DEFAULT 0,
    consumed     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP,
    CONSTRAINT ck_f2home_otp_purpose CHECK (purpose IN ('REGISTRATION', 'LOGIN_MFA', 'PASSWORD_RESET'))
);

CREATE INDEX idx_f2home_otp_phone_purpose ON f2home_otp_verifications (phone_number, purpose);