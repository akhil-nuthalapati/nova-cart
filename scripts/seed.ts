import fs from 'fs';
import path from 'path';

/**
 * Deterministic seed script calibrated to 02_BUSINESS_LOGIC.md canonical values.
 * Generates demo-db.json consumed by API routes in static/demo mode.
 * All data is SYNTHETIC DEMO DATA (ASM-006).
 */

class PRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

const rng = new PRNG(42);

const CITIES = ['City A', 'City B', 'City C']; // ASM-003
const CATEGORIES = ['grocery', 'pharmacy', 'bakery', 'stationery', 'other']; // ASM-004
const CATEGORY_WEIGHTS = [0.45, 0.20, 0.15, 0.10, 0.10]; // grocery-heavy

export function seedDatabase() {
  const TOTAL_ORDERS = 38500;   // MET-003 current
  const CANCELLATION_RATE = 0.11; // MET-007 current
  const AOV = 486;              // MET-004 current

  const totalCancelled = Math.round(TOTAL_ORDERS * CANCELLATION_RATE); // 4235

  // Golden values from DER-006 / GOLD-01
  const targetReasons: Record<string, number> = {
    unavailable: 1482,
    customer_delay: 1143,
    store_rejected: 762,
    partner_unavailable: 508,
    other: 339,
  };

  // Generate 620 stores across 3 cities with categories
  const stores = Array.from({ length: 620 }, (_, i) => {
    const cityIdx = i % 3;
    // Pick category weighted by CATEGORY_WEIGHTS
    const catRoll = rng.next();
    let cumulative = 0;
    let category = CATEGORIES[CATEGORIES.length - 1];
    for (let c = 0; c < CATEGORIES.length; c++) {
      cumulative += CATEGORY_WEIGHTS[c];
      if (catRoll < cumulative) {
        category = CATEGORIES[c];
        break;
      }
    }
    // Simulate staleness: some stores update every few hours, some every 1-3 days (S1 §5)
    const stalenessHours = rng.next() < 0.3
      ? Math.floor(rng.next() * 24)         // 30% update daily or better
      : Math.floor(24 + rng.next() * 48);   // 70% update every 1-3 days

    return {
      id: `store-${i + 1}`,
      name: `Store ${i + 1}`,
      city: CITIES[cityIdx],
      category,
      status: 'active',
      last_confirmed_hours_ago: stalenessHours,
    };
  });

  // Distribute orders deterministically
  const orders = [];
  let cancelledCount = 0;
  const reasonCounts: Record<string, number> = {
    unavailable: 0, customer_delay: 0, store_rejected: 0, partner_unavailable: 0, other: 0,
  };

  for (let i = 0; i < TOTAL_ORDERS; i++) {
    const isCancelled = cancelledCount < totalCancelled && (i % 100 < 11);

    let status = 'delivered';
    let reason: string | null = null;

    if (isCancelled) {
      status = 'cancelled';
      cancelledCount++;
      for (const [r, target] of Object.entries(targetReasons)) {
        if (reasonCounts[r] < target) {
          reason = r;
          reasonCounts[r]++;
          break;
        }
      }
      if (!reason) reason = 'other';
    }

    orders.push({
      id: `ord-${i + 1}`,
      store_id: `store-${Math.floor(rng.next() * 620) + 1}`,
      status,
      cancellation_reason: reason,
      gmv: status === 'delivered' ? AOV : 0,
    });
  }

  // Ticket breakdown from DER-007 (sum = 5900 = MET-008 current)
  const tickets = {
    refund_status: 1711,
    delayed_delivery: 1416,
    missing_unavailable: 1121,
    coupon: 767,
    incorrect_order: 531,
    other: 354,
  };

  const db = {
    _synthetic: true, // ASM-006: all data is synthetic demo data
    stores,
    orders,
    tickets,
    // ───── CANONICAL METRIC SNAPSHOTS from 02_BUSINESS_LOGIC.md §2 ─────
    snapshots: {
      baseline: {
        met001_registered_users: 82000,    // MET-001 6mo ago
        met002_mau: 39000,                 // MET-002 6mo ago
        met003_monthly_orders: 31200,      // MET-003 6mo ago
        met004_aov: 452,                   // MET-004 6mo ago
        met005_repeat_purchase_rate: 0.41, // MET-005 6mo ago
        met006_avg_delivery_time: 29,      // MET-006 6mo ago (minutes)
        met007_cancellation_rate: 0.06,    // MET-007 6mo ago
        met008_support_tickets: 3100,      // MET-008 6mo ago
        met009_promo_spend: 950000,        // MET-009 6mo ago (₹9.5L)
        met010_revenue: 2180000,           // MET-010 6mo ago (₹21.8L)
      },
      current: {
        met001_registered_users: 120000,   // MET-001 current (S1: 1,20,000)
        met002_mau: 46000,                 // MET-002 current
        met003_monthly_orders: 38500,      // MET-003 current
        met004_aov: 486,                   // MET-004 current
        met005_repeat_purchase_rate: 0.27, // MET-005 current
        met006_avg_delivery_time: 37,      // MET-006 current (minutes)
        met007_cancellation_rate: 0.11,    // MET-007 current
        met008_support_tickets: 5900,      // MET-008 current
        met009_promo_spend: 1700000,       // MET-009 current (₹17L)
        met010_revenue: 2610000,           // MET-010 current (₹26.1L)
      },
    },
  };

  const dbPath = path.join(process.cwd(), 'public', 'demo-db.json');
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log(`[SEED] Wrote ${TOTAL_ORDERS} orders, ${stores.length} stores (3 cities) to ${dbPath}`);
  console.log(`[SEED] Cancelled: ${cancelledCount}, Reasons:`, reasonCounts);
  console.log(`[SEED] Baseline/Current snapshots match 02_BUSINESS_LOGIC.md §2 canonical values.`);
}

seedDatabase();
