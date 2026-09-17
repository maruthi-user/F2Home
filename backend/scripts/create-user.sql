-- ============================================================
-- Directly create an F2Home user (bypasses the OTP registration flow).
--
-- PREREQUISITE: start the backend ONCE with the LOCAL profile so
-- Flyway creates the tables in your local F2Home database:
--     cd backend
--     mvn spring-boot:run -Dspring-boot.run.profiles=local
--
-- Password for the inserted user: Secret@123
-- (stored as a BCrypt hash, same algorithm/encoder as the app).
--
-- Run from pgAdmin (Query Tool on F2Home) or:
--   PGPASSWORD=admin psql -U postgres -h localhost -d F2Home -f create-user.sql
-- ============================================================

-- A FARMER account
INSERT INTO f2home_users
    (phone_number, email, password_hash, role, status, phone_verified, full_name, created_at, updated_at)
VALUES
    ('+918497987514', 'farmer@f2home.com',
     '$2a$10$gmXPAwVL8yj0Bi/3XoBRLOVfmvsbZ9aTGKmwooYk7sqQLvQoMOu0a',
     'FARMER', 'ACTIVE', TRUE, 'Test Farmer', NOW(), NOW())
ON CONFLICT (phone_number) DO UPDATE
    SET password_hash   = EXCLUDED.password_hash,
        status          = 'ACTIVE',
        phone_verified  = TRUE;

-- Uncomment for an ADMIN account too (ADMIN cannot self-register via API,
-- so direct insert is the intended way to bootstrap one):
-- INSERT INTO f2home_users
--     (phone_number, email, password_hash, role, status, phone_verified, full_name, created_at, updated_at)
-- VALUES
--     ('+919999900001', 'admin@f2home.com',
--      '$2a$10$gmXPAwVL8yj0Bi/3XoBRLOVfmvsbZ9aTGKmwooYk7sqQLvQoMOu0a',
--      'ADMIN', 'ACTIVE', TRUE, 'F2Home Admin', NOW(), NOW())
-- ON CONFLICT (phone_number) DO UPDATE
--     SET password_hash = EXCLUDED.password_hash,
--         status = 'ACTIVE',
--         phone_verified = TRUE;

-- Login afterwards via Swagger:
--   POST http://localhost:8081/api/f2home/auth/login
--   {"phoneNumber": "+918497987514", "password": "Secret@123"}
