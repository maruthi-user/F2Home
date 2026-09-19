-- ============================================================
-- Seed F2Home test users (bypasses the OTP registration flow).
--
-- PREREQUISITE: start the backend ONCE with the LOCAL profile so
-- Flyway creates the tables in your local F2Home database:
--     cd backend
--     ./mvnw spring-boot:run          (local profile is the default)
--
-- Every user below has the SAME password:  Test@123
-- (BCrypt hash generated with the app's own BCryptPasswordEncoder).
--
-- Run from pgAdmin (Query Tool on F2Home) or:
--   PGPASSWORD=admin psql -U postgres -h localhost -d F2Home -f create-user.sql
--
-- Re-runnable: existing rows (matched on phone_number) are reset to the
-- values below.
-- ============================================================

INSERT INTO f2home_users
    (phone_number, email, password_hash, role, status, phone_verified, full_name, created_at, updated_at)
VALUES
    -- Farmers
    ('+919000000001', 'ravi.farmer@f2home.test',
     '$2a$10$LcXJEYJaZ0LHSNNjZUGCx.yfcOV9WRoTNINfd5gC5NAXAfKQPFoF.',
     'FARMER', 'ACTIVE', TRUE, 'Ravi Kumar', NOW(), NOW()),
    ('+919000000002', 'lakshmi.farmer@f2home.test',
     '$2a$10$LcXJEYJaZ0LHSNNjZUGCx.yfcOV9WRoTNINfd5gC5NAXAfKQPFoF.',
     'FARMER', 'ACTIVE', TRUE, 'Lakshmi Devi', NOW(), NOW()),
    -- Customers
    ('+919000000003', 'anita.customer@f2home.test',
     '$2a$10$LcXJEYJaZ0LHSNNjZUGCx.yfcOV9WRoTNINfd5gC5NAXAfKQPFoF.',
     'CUSTOMER', 'ACTIVE', TRUE, 'Anita Sharma', NOW(), NOW()),
    ('+919000000004', 'suresh.customer@f2home.test',
     '$2a$10$LcXJEYJaZ0LHSNNjZUGCx.yfcOV9WRoTNINfd5gC5NAXAfKQPFoF.',
     'CUSTOMER', 'ACTIVE', TRUE, 'Suresh Reddy', NOW(), NOW()),
    -- Admin (cannot self-register via the API; direct insert is intended)
    ('+919000000009', 'admin@f2home.test',
     '$2a$10$LcXJEYJaZ0LHSNNjZUGCx.yfcOV9WRoTNINfd5gC5NAXAfKQPFoF.',
     'ADMIN', 'ACTIVE', TRUE, 'F2Home Admin', NOW(), NOW())
ON CONFLICT (phone_number) DO UPDATE
    SET password_hash   = EXCLUDED.password_hash,
        email           = EXCLUDED.email,
        full_name       = EXCLUDED.full_name,
        role            = EXCLUDED.role,
        status          = 'ACTIVE',
        phone_verified  = TRUE,
        updated_at      = NOW();

-- Login afterwards (all with password Test@123):
--   Farmer   : +919000000001  Ravi Kumar
--   Farmer   : +919000000002  Lakshmi Devi
--   Customer : +919000000003  Anita Sharma
--   Customer : +919000000004  Suresh Reddy
--   Admin    : +919000000009  F2Home Admin
