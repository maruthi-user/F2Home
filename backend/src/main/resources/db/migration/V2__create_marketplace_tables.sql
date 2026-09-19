-- ============================================================
-- V2: Marketplace - products, product media, orders, order items
-- ============================================================

CREATE TABLE f2home_products (
    id              BIGSERIAL PRIMARY KEY,
    farmer_id       BIGINT         NOT NULL,
    farmer_name     VARCHAR(255)   NOT NULL,
    name            VARCHAR(150)   NOT NULL,
    category        VARCHAR(50)    NOT NULL,
    description     TEXT,
    price           NUMERIC(12, 2) NOT NULL,
    unit            VARCHAR(20)    NOT NULL,
    quantity        INT            NOT NULL DEFAULT 0,
    location_label  VARCHAR(255)   NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    status          VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT fk_f2home_products_farmer FOREIGN KEY (farmer_id)
        REFERENCES f2home_users (id),
    CONSTRAINT ck_f2home_products_price    CHECK (price > 0),
    CONSTRAINT ck_f2home_products_quantity CHECK (quantity >= 0),
    CONSTRAINT ck_f2home_products_status   CHECK (status IN ('ACTIVE', 'DELETED'))
);

CREATE INDEX idx_f2home_products_farmer   ON f2home_products (farmer_id);
CREATE INDEX idx_f2home_products_category ON f2home_products (category) WHERE status = 'ACTIVE';
-- Bounding-box pre-filter for the "within N km" query.
CREATE INDEX idx_f2home_products_lat_lng  ON f2home_products (lat, lng) WHERE status = 'ACTIVE';

-- Product photos / video. Bytes live in Postgres (bytea) so the app needs no
-- file storage on the host; the byte column is only read by the media
-- streaming endpoint, never when listing products.
CREATE TABLE f2home_product_media (
    id            UUID          PRIMARY KEY,
    product_id    BIGINT        NOT NULL,
    media_type    VARCHAR(10)   NOT NULL,
    content_type  VARCHAR(100)  NOT NULL,
    file_name     VARCHAR(255),
    size_bytes    BIGINT        NOT NULL,
    sort_order    INT           NOT NULL DEFAULT 0,
    data          BYTEA         NOT NULL,
    created_at    TIMESTAMP,
    CONSTRAINT fk_f2home_product_media_product FOREIGN KEY (product_id)
        REFERENCES f2home_products (id) ON DELETE CASCADE,
    CONSTRAINT ck_f2home_product_media_type CHECK (media_type IN ('IMAGE', 'VIDEO'))
);

CREATE INDEX idx_f2home_product_media_product ON f2home_product_media (product_id, sort_order);

CREATE TABLE f2home_orders (
    id               BIGSERIAL PRIMARY KEY,
    customer_id      BIGINT         NOT NULL,
    customer_name    VARCHAR(255)   NOT NULL,
    customer_phone   VARCHAR(20)    NOT NULL,
    status           VARCHAR(20)    NOT NULL DEFAULT 'PLACED',
    payment_method   VARCHAR(20)    NOT NULL,
    payment_status   VARCHAR(20)    NOT NULL,
    item_count       INT            NOT NULL,
    subtotal         NUMERIC(12, 2) NOT NULL,
    total            NUMERIC(12, 2) NOT NULL,
    -- delivery address
    address_mode     VARCHAR(20)    NOT NULL,
    address_label    VARCHAR(255),
    address_line1    VARCHAR(255),
    address_landmark VARCHAR(255),
    address_city     VARCHAR(100),
    address_pincode  VARCHAR(10),
    address_lat      DOUBLE PRECISION,
    address_lng      DOUBLE PRECISION,
    contact_name     VARCHAR(255)   NOT NULL,
    contact_phone    VARCHAR(20)    NOT NULL,
    delivery_note    VARCHAR(500),
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    CONSTRAINT fk_f2home_orders_customer FOREIGN KEY (customer_id)
        REFERENCES f2home_users (id),
    CONSTRAINT ck_f2home_orders_status CHECK (status IN ('PLACED', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT ck_f2home_orders_payment_method CHECK (payment_method IN ('COD', 'CARD', 'UPI')),
    CONSTRAINT ck_f2home_orders_payment_status CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    CONSTRAINT ck_f2home_orders_address_mode CHECK (address_mode IN ('CURRENT_LOCATION', 'MANUAL'))
);

CREATE INDEX idx_f2home_orders_customer ON f2home_orders (customer_id, created_at DESC);

-- Snapshot of each line at purchase time (name/price copied, so later
-- edits or deletion of the product never rewrite history).
CREATE TABLE f2home_order_items (
    id            BIGSERIAL PRIMARY KEY,
    order_id      BIGINT         NOT NULL,
    product_id    BIGINT,
    product_name  VARCHAR(150)   NOT NULL,
    farmer_id     BIGINT         NOT NULL,
    farmer_name   VARCHAR(255)   NOT NULL,
    unit          VARCHAR(20)    NOT NULL,
    unit_price    NUMERIC(12, 2) NOT NULL,
    quantity      INT            NOT NULL,
    line_total    NUMERIC(12, 2) NOT NULL,
    thumbnail_id  UUID,
    CONSTRAINT fk_f2home_order_items_order FOREIGN KEY (order_id)
        REFERENCES f2home_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_f2home_order_items_product FOREIGN KEY (product_id)
        REFERENCES f2home_products (id) ON DELETE SET NULL,
    CONSTRAINT ck_f2home_order_items_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_f2home_order_items_order   ON f2home_order_items (order_id);
CREATE INDEX idx_f2home_order_items_farmer  ON f2home_order_items (farmer_id);
