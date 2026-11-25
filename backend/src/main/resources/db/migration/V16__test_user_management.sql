ALTER TABLE f2home_users
    ADD COLUMN username varchar(40),
    ADD COLUMN test_account boolean NOT NULL DEFAULT false,
    ADD COLUMN session_version bigint NOT NULL DEFAULT 0,
    ADD COLUMN default_address_id bigint REFERENCES f2home_saved_addresses(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX f2home_users_username_unique ON f2home_users (lower(username));

CREATE TABLE f2home_test_user_audit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_id bigint NOT NULL REFERENCES f2home_users(id),
    user_id bigint NOT NULL REFERENCES f2home_users(id),
    action varchar(30) NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now()
);
