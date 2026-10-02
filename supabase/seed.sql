-- =============================================================================
-- Nova Cart — Deterministic Seed Data
-- Calibrated to MET-001..010 canonical values from 02_BUSINESS_LOGIC.md §2
-- All data is SYNTHETIC DEMO DATA (ASM-006)
-- =============================================================================

-- ── 1. Cities (3 cities per ASM-003) ──

INSERT INTO cities (id, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'City A'),
  ('c1000000-0000-0000-0000-000000000002', 'City B'),
  ('c1000000-0000-0000-0000-000000000003', 'City C')
ON CONFLICT (name) DO NOTHING;


-- ── 2. Metric Snapshots (MET-001..010 canonical values) ──

INSERT INTO metric_snapshots (period, payload, source) VALUES
  ('baseline', '{
    "met001_registered_users": 82000,
    "met002_mau": 39000,
    "met003_monthly_orders": 31200,
    "met004_aov": 452,
    "met005_repeat_purchase_rate": 0.41,
    "met006_avg_delivery_time": 29,
    "met007_cancellation_rate": 0.06,
    "met008_support_tickets": 3100,
    "met009_promo_spend": 950000,
    "met010_revenue": 2180000
  }', 'seed_canonical'),
  ('current', '{
    "met001_registered_users": 120000,
    "met002_mau": 46000,
    "met003_monthly_orders": 38500,
    "met004_aov": 486,
    "met005_repeat_purchase_rate": 0.27,
    "met006_avg_delivery_time": 37,
    "met007_cancellation_rate": 0.11,
    "met008_support_tickets": 5900,
    "met009_promo_spend": 1700000,
    "met010_revenue": 2610000
  }', 'seed_canonical')
ON CONFLICT (period) DO UPDATE SET
  payload = EXCLUDED.payload,
  source = EXCLUDED.source;


-- ── 3. Rule Config (BUS-RULE-V1 thresholds) ──

INSERT INTO rule_config (version, payload, active) VALUES
  ('v1', '{
    "staleness": { "fresh_h": 24, "critical_after_h": 72 },
    "srs": {
      "weights": { "stale": 0.4, "unavail": 0.4, "reject": 0.2 },
      "baselines": { "unavail_cancel_rate": 0.0385, "reject_rate": 0.0198 },
      "bands": { "healthy_min": 80, "watch_min": 60 },
      "min_orders": 20,
      "rate_cap_multiplier": 2
    },
    "nudge": { "max_items": 10, "demand_window_d": 7 },
    "scenario": { "presets": [0.10, 0.25, 0.50] },
    "itemConfidence": { "item_window_d": 30, "item_cancel_low": 3, "hide_low_confidence": false },
    "verdict": { "tolerance": 0, "min_worse": 3 },
    "dataQuality": { "snapshot_max_age_d": 30, "reason_share_tolerance_pp": 1 }
  }', true)
ON CONFLICT (version) DO UPDATE SET
  payload = EXCLUDED.payload,
  active = EXCLUDED.active;


-- ── 4. Catalog Items (sample products across categories) ──

INSERT INTO catalog_items (id, name, category, base_price_paise) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Farm Fresh Whole Milk 1L', 'dairy', 6500),
  ('a0000000-0000-0000-0000-000000000002', 'Brown Eggs (Pack of 12)', 'dairy', 8900),
  ('a0000000-0000-0000-0000-000000000003', 'Whole Wheat Bread 400g', 'bakery', 4500),
  ('a0000000-0000-0000-0000-000000000004', 'Organic Bananas 1kg', 'fruits', 4900),
  ('a0000000-0000-0000-0000-000000000005', 'Greek Yogurt 400g', 'dairy', 12500),
  ('a0000000-0000-0000-0000-000000000006', 'Salted Butter 500g', 'dairy', 23000),
  ('a0000000-0000-0000-0000-000000000007', 'Cheddar Cheese Block 200g', 'dairy', 17500),
  ('a0000000-0000-0000-0000-000000000008', 'Rolled Oats 1kg', 'cereals', 19900),
  ('a0000000-0000-0000-0000-000000000009', 'Organic Soy Milk 1L', 'dairy', 8900),
  ('a0000000-0000-0000-0000-000000000010', 'Paracetamol 500mg (10 tab)', 'pharmacy', 2500),
  ('a0000000-0000-0000-0000-000000000011', 'Ballpoint Pen (Pack of 5)', 'stationery', 4500),
  ('a0000000-0000-0000-0000-000000000012', 'A4 Notebook 200pg', 'stationery', 7500)
ON CONFLICT (id) DO NOTHING;


-- ── 5. Generate 620 Stores across 3 cities ──
-- Uses a generate_series approach for deterministic, bulk insertion.

INSERT INTO stores (id, city_id, name, category, active)
SELECT
  ('b0000000-0000-0000-0000-' || lpad(s::text, 12, '0'))::uuid,
  CASE (s % 3)
    WHEN 0 THEN 'c1000000-0000-0000-0000-000000000001'::uuid  -- City A
    WHEN 1 THEN 'c1000000-0000-0000-0000-000000000002'::uuid  -- City B
    WHEN 2 THEN 'c1000000-0000-0000-0000-000000000003'::uuid  -- City C
  END,
  'Store ' || s,
  CASE
    WHEN s % 10 < 5 THEN 'grocery'::store_category     -- 45%
    WHEN s % 10 < 7 THEN 'pharmacy'::store_category     -- 20%
    WHEN s % 10 < 8 THEN 'bakery'::store_category       -- 15%
    WHEN s % 10 < 9 THEN 'stationery'::store_category   -- 10%
    ELSE 'other'::store_category                         -- 10%
  END,
  true
FROM generate_series(1, 620) AS s
ON CONFLICT (id) DO NOTHING;


-- ── 6. Store Items (link stores to catalog items with varied freshness) ──
-- Give each store 6-8 items with varying last_confirmed_at

INSERT INTO store_items (store_id, item_id, in_stock, last_confirmed_at)
SELECT
  ('b0000000-0000-0000-0000-' || lpad(s::text, 12, '0'))::uuid,
  ('a0000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  -- 85% of items are in stock
  (((s * 7 + i * 13) % 100) >= 15),
  -- Staleness varies: some fresh (0-24h), some stale (24-72h), some critical (>72h)
  now() - (
    CASE
      WHEN (s * 3 + i * 7) % 10 < 3 THEN  -- 30%: fresh
        ((s * 3 + i) % 24) * interval '1 hour'
      WHEN (s * 3 + i * 7) % 10 < 7 THEN  -- 40%: stale
        (24 + ((s * 5 + i * 3) % 48)) * interval '1 hour'
      ELSE                                  -- 30%: critical
        (72 + ((s * 11 + i * 2) % 48)) * interval '1 hour'
    END
  )
FROM generate_series(1, 620) AS s
CROSS JOIN generate_series(1, 8) AS i
WHERE i <= (6 + (s % 3))  -- 6 to 8 items per store
ON CONFLICT (store_id, item_id) DO NOTHING;


-- ── 7. Customers (2000 pseudonymous customers) ──

INSERT INTO customers (id)
SELECT ('d0000000-0000-0000-0000-' || lpad(c::text, 12, '0'))::uuid
FROM generate_series(1, 2000) AS c
ON CONFLICT (id) DO NOTHING;


-- ── 8. Orders (38,500 total — MET-003 current) ──
-- 11% cancellation rate = 4,235 cancelled (MET-007)
-- Reason distribution: unavailable 35%, customer_delay 27%, store_rejected 18%,
--                       partner_unavailable 12%, other 8%

INSERT INTO orders (id, customer_id, store_id, order_value_paise, status, sequence_no, placed_at)
SELECT
  ('e0000000-0000-0000-' || lpad((o / 65536)::text, 4, '0') || '-' || lpad((o % 65536)::text, 12, '0'))::uuid,
  ('d0000000-0000-0000-0000-' || lpad(((o % 2000) + 1)::text, 12, '0'))::uuid,
  ('b0000000-0000-0000-0000-' || lpad(((o % 620) + 1)::text, 12, '0'))::uuid,
  CASE WHEN (o % 100) < 11 THEN 0 ELSE 48600 END,  -- ₹486 AOV for delivered; 0 for cancelled
  CASE WHEN (o % 100) < 11 THEN 'cancelled'::order_status ELSE 'delivered'::order_status END,
  ((o % 5) + 1),  -- sequence_no 1-5
  now() - ((o % 30) * interval '1 day') - ((o % 24) * interval '1 hour')
FROM generate_series(1, 38500) AS o
ON CONFLICT (id) DO NOTHING;


-- ── 9. Cancellations (for all cancelled orders) ──
-- Golden values (GOLD-01):
--   unavailable: 1482, customer_delay: 1143, store_rejected: 762,
--   partner_unavailable: 508, other: 339
-- Total: 4234 (≈4235 from 38500 × 0.11)

INSERT INTO cancellations (order_id, reason)
SELECT
  o.id,
  CASE
    WHEN row_number() OVER (ORDER BY o.id) <= 1482 THEN 'unavailable'::cancellation_reason
    WHEN row_number() OVER (ORDER BY o.id) <= 2625 THEN 'customer_delay'::cancellation_reason
    WHEN row_number() OVER (ORDER BY o.id) <= 3387 THEN 'store_rejected'::cancellation_reason
    WHEN row_number() OVER (ORDER BY o.id) <= 3895 THEN 'partner_unavailable'::cancellation_reason
    ELSE 'other'::cancellation_reason
  END
FROM orders o
WHERE o.status = 'cancelled'
ON CONFLICT (order_id) DO NOTHING;


-- ── 10. Support Tickets (5,900 total — MET-008 current) ──
-- Category breakdown from DER-007 / MET-017:
--   refund_status: 1711, delayed_delivery: 1416, missing_unavailable: 1121,
--   coupon: 767, incorrect_order: 531, other: 354

INSERT INTO support_tickets (order_id, category, opened_at)
SELECT
  NULL,  -- not all tickets are order-linked
  CASE
    WHEN t <= 1711 THEN 'refund_status'::ticket_category
    WHEN t <= 3127 THEN 'delayed_delivery'::ticket_category
    WHEN t <= 4248 THEN 'missing_unavailable'::ticket_category
    WHEN t <= 5015 THEN 'coupon'::ticket_category
    WHEN t <= 5546 THEN 'incorrect_order'::ticket_category
    ELSE 'other'::ticket_category
  END,
  now() - ((t % 30) * interval '1 day')
FROM generate_series(1, 5900) AS t;
