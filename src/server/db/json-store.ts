/**
 * JSON Store — In-memory cached loader and query helpers for demo/static mode.
 * ARCH-004: All static file access is encapsulated here, never in routes.
 */

import fs from 'fs';
import path from 'path';

export interface DemoDBStore {
  id: string;
  name: string;
  city: string;
  category: string;
  status: string;
  last_confirmed_hours_ago: number;
}

export interface DemoDBOrder {
  id: string;
  store_id: string;
  status: string;
  cancellation_reason: string | null;
  gmv: number;
}

export interface DemoDB {
  _synthetic: boolean;
  stores: DemoDBStore[];
  orders: DemoDBOrder[];
  tickets: Record<string, number>;
  snapshots: {
    baseline: Record<string, number>;
    current: Record<string, number>;
  };
}

let cachedDB: DemoDB | null = null;
const memoryIdempotencyKeys = new Set<string>();

/**
 * Get the demo database, caching in memory for performance.
 */
export function getDemoDB(): DemoDB {
  if (cachedDB) return cachedDB;

  const dbPath = path.join(process.cwd(), 'public', 'demo-db.json');
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    cachedDB = JSON.parse(raw) as DemoDB;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[json-store] Error loading demo-db.json: ${message}`);
    // Fallback minimal structure if file missing or corrupt
    cachedDB = {
      _synthetic: true,
      stores: [],
      orders: [],
      tickets: {
        refund_status: 1711,
        delayed_delivery: 1416,
        missing_unavailable: 1121,
        coupon: 767,
        incorrect_order: 531,
        other: 354,
      },
      snapshots: {
        baseline: {
          met001_registered_users: 82000,
          met002_mau: 39000,
          met003_monthly_orders: 31200,
          met004_aov: 452,
          met005_repeat_purchase_rate: 0.41,
          met006_avg_delivery_time: 29,
          met007_cancellation_rate: 0.06,
          met008_support_tickets: 3100,
          met009_promo_spend: 950000,
          met010_revenue: 2180000,
        },
        current: {
          met001_registered_users: 120000,
          met002_mau: 46000,
          met003_monthly_orders: 38500,
          met004_aov: 486,
          met005_repeat_purchase_rate: 0.27,
          met006_avg_delivery_time: 37,
          met007_cancellation_rate: 0.11,
          met008_support_tickets: 5900,
          met009_promo_spend: 1700000,
          met010_revenue: 2610000,
        },
      },
    };
  }
  return cachedDB;
}

/**
 * Invalidate cached DB (used when re-seeding or updating).
 */
export function invalidateDemoCache(): void {
  cachedDB = null;
  memoryIdempotencyKeys.clear();
}

/**
 * Check idempotency key in demo mode.
 */
export function checkDemoIdempotencyKey(key: string): boolean {
  return memoryIdempotencyKeys.has(key);
}

/**
 * Record idempotency key in demo mode.
 */
export function recordDemoIdempotencyKey(key: string): void {
  memoryIdempotencyKeys.add(key);
}

/**
 * Update store staleness in demo mode (e.g. after confirmation).
 */
export function updateDemoStoreStaleness(storeId: string, hoursAgo: number = 0): void {
  const db = getDemoDB();
  const store = db.stores.find((s) => s.id === storeId);
  if (store) {
    store.last_confirmed_hours_ago = hoursAgo;
  }
}
