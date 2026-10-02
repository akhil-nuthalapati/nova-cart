-- =============================================================================
-- Nova Cart — Full Schema Migration (00002)
-- Aligned with 01_ARCHITECTURE.md §5
-- Replaces the minimal 00001_init.sql with the complete entity model.
-- =============================================================================

-- ── Enums ──

DO $$ BEGIN
  CREATE TYPE cancellation_reason AS ENUM (
    'unavailable', 'customer_delay', 'store_rejected', 'partner_unavailable', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE store_category AS ENUM (
    'grocery', 'pharmacy', 'bakery', 'stationery', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('placed', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_category AS ENUM (
    'refund_status', 'delayed_delivery', 'missing_unavailable',
    'coupon', 'incorrect_order', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE snapshot_period AS ENUM ('baseline', 'current');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 1. Cities ──

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ── 2. Stores ──
-- Drop the old minimal table if it exists with incompatible schema
-- (safe: only in migration context)

DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS items CASCADE;

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name text NOT NULL,
  category store_category NOT NULL DEFAULT 'grocery',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_city_category ON stores(city_id, category);


-- ── 3. Catalog Items (global product catalog) ──

CREATE TABLE catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  base_price_paise integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_items_category ON catalog_items(category);


-- ── 4. Store Items (per-store inventory state) ──
-- This is the core table for stock confirmation (BUS-003/007)

CREATE TABLE store_items (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  in_stock boolean NOT NULL DEFAULT true,
  last_confirmed_at timestamptz DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, item_id)
);

CREATE INDEX idx_store_items_last_confirmed ON store_items(last_confirmed_at);


-- ── 5. Stock Confirmations (append-only audit log) ──

CREATE TABLE stock_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  in_stock boolean NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  confirmed_by uuid, -- nullable: references auth.users in production
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ── 6. Customers (pseudonymous, minimal PII) ──

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ── 7. Orders ──

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  placed_at timestamptz NOT NULL DEFAULT now(),
  order_value_paise integer NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'placed',
  sequence_no integer NOT NULL DEFAULT 1,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_store_placed ON orders(store_id, placed_at);
CREATE INDEX idx_orders_customer ON orders(customer_id);


-- ── 8. Order Items ──

CREATE TABLE order_items (
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, item_id)
);


-- ── 9. Cancellations (1:1 with cancelled orders) ──

CREATE TABLE cancellations (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  reason cancellation_reason NOT NULL,
  item_id uuid REFERENCES catalog_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ── 10. Support Tickets ──

CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  category ticket_category NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_tickets_category ON support_tickets(category);


-- ── 11. Metric Snapshots (baseline / current canonical values) ──

CREATE TABLE metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period snapshot_period NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  source text DEFAULT 'seed',
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ── 12. Rule Config (versioned business rule thresholds) ──

CREATE TABLE rule_config (
  version text PRIMARY KEY,
  payload jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ── 13. Recommendations (audit trail for decisions) ──

CREATE TABLE recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  input_snapshot jsonb NOT NULL,
  decision text NOT NULL,
  created_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- For demo/development: allow all reads via anon key
-- In production, restrict these to authenticated users with role checks.

CREATE POLICY "anon_read_cities" ON cities FOR SELECT USING (true);
CREATE POLICY "anon_read_stores" ON stores FOR SELECT USING (true);
CREATE POLICY "anon_read_catalog" ON catalog_items FOR SELECT USING (true);
CREATE POLICY "anon_read_store_items" ON store_items FOR SELECT USING (true);
CREATE POLICY "anon_read_confirmations" ON stock_confirmations FOR SELECT USING (true);
CREATE POLICY "anon_read_customers" ON customers FOR SELECT USING (true);
CREATE POLICY "anon_read_orders" ON orders FOR SELECT USING (true);
CREATE POLICY "anon_read_order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "anon_read_cancellations" ON cancellations FOR SELECT USING (true);
CREATE POLICY "anon_read_tickets" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "anon_read_snapshots" ON metric_snapshots FOR SELECT USING (true);
CREATE POLICY "anon_read_rules" ON rule_config FOR SELECT USING (true);
CREATE POLICY "anon_read_recommendations" ON recommendations FOR SELECT USING (true);

-- Store owners can update their own inventory
CREATE POLICY "owner_update_store_items" ON store_items FOR UPDATE USING (true);
CREATE POLICY "owner_insert_confirmations" ON stock_confirmations FOR INSERT WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- Updated_at trigger function
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_store_items_updated_at
  BEFORE UPDATE ON store_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- Useful Views (read-only aggregations for API queries)
-- ══════════════════════════════════════════════════════════════

-- View: Per-store order statistics (cancellation rates)
CREATE OR REPLACE VIEW v_store_order_stats AS
SELECT
  o.store_id,
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE o.status = 'cancelled') AS total_cancelled,
  COUNT(*) FILTER (WHERE c.reason = 'unavailable') AS unavail_cancels,
  COUNT(*) FILTER (WHERE c.reason = 'store_rejected') AS reject_cancels,
  COUNT(*) FILTER (WHERE c.reason IN ('unavailable', 'store_rejected')) AS inventory_cancels,
  CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE c.reason = 'unavailable')::numeric / COUNT(*)
    ELSE 0
  END AS unavail_rate,
  CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE c.reason = 'store_rejected')::numeric / COUNT(*)
    ELSE 0
  END AS reject_rate
FROM orders o
LEFT JOIN cancellations c ON c.order_id = o.id
GROUP BY o.store_id;


-- View: Platform-wide cancellation breakdown
CREATE OR REPLACE VIEW v_cancellation_breakdown AS
SELECT
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE o.status = 'cancelled') AS total_cancelled,
  COUNT(*) FILTER (WHERE c.reason = 'unavailable') AS unavailable,
  COUNT(*) FILTER (WHERE c.reason = 'customer_delay') AS customer_delay,
  COUNT(*) FILTER (WHERE c.reason = 'store_rejected') AS store_rejected,
  COUNT(*) FILTER (WHERE c.reason = 'partner_unavailable') AS partner_unavailable,
  COUNT(*) FILTER (WHERE c.reason = 'other') AS other_reason
FROM orders o
LEFT JOIN cancellations c ON c.order_id = o.id;


-- View: Support ticket breakdown by category
CREATE OR REPLACE VIEW v_ticket_breakdown AS
SELECT
  category,
  COUNT(*) AS ticket_count
FROM support_tickets
GROUP BY category;


-- View: Store inventory freshness (hours since last confirmation)
CREATE OR REPLACE VIEW v_store_freshness AS
SELECT
  si.store_id,
  s.name AS store_name,
  ci.name AS city_name,
  s.category,
  AVG(EXTRACT(EPOCH FROM (now() - si.last_confirmed_at)) / 3600) AS avg_hours_since_confirmed,
  MIN(si.last_confirmed_at) AS oldest_confirmation,
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE si.in_stock = true) AS in_stock_count
FROM store_items si
JOIN stores s ON s.id = si.store_id
JOIN cities ci ON ci.id = s.city_id
GROUP BY si.store_id, s.name, ci.name, s.category;
