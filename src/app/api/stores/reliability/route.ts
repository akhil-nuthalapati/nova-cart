import { NextResponse } from 'next/server';
import { computeSRS } from '../../../../domain/reliability';
import { RULES_V1 } from '../../../../config/rules.v1';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * API-03: GET /api/stores/reliability
 * Roles: pm (Partner Manager)
 * Purpose: BUS-003, BUS-004 Store Reliability Scores with filtering and sorting
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const band = searchParams.get('band');
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'srs_asc'; // default to most at-risk
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const db = getDB();
  const stores = db.stores || [];
  const orders = db.orders || [];

  // Group orders by store to compute rates
  const storeOrderStats: Record<string, { total: number; unavail: number; reject: number }> = {};
  for (const o of orders) {
    if (!storeOrderStats[o.store_id]) {
      storeOrderStats[o.store_id] = { total: 0, unavail: 0, reject: 0 };
    }
    storeOrderStats[o.store_id].total++;
    if (o.cancellation_reason === 'unavailable') storeOrderStats[o.store_id].unavail++;
    if (o.cancellation_reason === 'store_rejected') storeOrderStats[o.store_id].reject++;
  }

  // Compute SRS for each store
  let scoredStores = stores.map((store: any) => {
    const stats = storeOrderStats[store.id] || { total: 0, unavail: 0, reject: 0 };
    const hours = store.last_confirmed_hours_ago ?? 24;
    const r_stale = Math.min(1, hours / RULES_V1.staleness.critical_after_h);
    const unavail_rate = stats.total > 0 ? stats.unavail / stats.total : 0;
    const reject_rate = stats.total > 0 ? stats.reject / stats.total : 0;

    const srsResult = computeSRS(
      {
        r_stale,
        store_unavail_rate: unavail_rate,
        store_reject_rate: reject_rate,
        orders_in_window: stats.total,
      },
      RULES_V1.srs
    );

    return {
      store_id: store.id,
      name: store.name,
      city: store.city,
      category: store.category,
      last_confirmed_hours_ago: hours,
      orders_30d: stats.total,
      cancels_30d: stats.unavail + stats.reject,
      srs: srsResult.srs,
      band: srsResult.band,
      components: {
        r_stale: Number(srsResult.r_stale.toFixed(3)),
        r_unavail: Number(srsResult.r_unavail.toFixed(3)),
        r_reject: Number(srsResult.r_reject.toFixed(3)),
        risk: Number(srsResult.risk.toFixed(3)),
      },
    };
  });

  // Apply filters
  if (city) {
    scoredStores = scoredStores.filter((s: any) => s.city.toLowerCase() === city.toLowerCase());
  }
  if (band) {
    scoredStores = scoredStores.filter((s: any) => s.band.toLowerCase() === band.toLowerCase());
  }
  if (category) {
    scoredStores = scoredStores.filter((s: any) => s.category.toLowerCase() === category.toLowerCase());
  }

  // Sort
  if (sort === 'srs_asc') {
    scoredStores.sort((a: any, b: any) => a.srs - b.srs);
  } else if (sort === 'srs_desc') {
    scoredStores.sort((a: any, b: any) => b.srs - a.srs);
  } else if (sort === 'cancels_desc') {
    scoredStores.sort((a: any, b: any) => b.cancels_30d - a.cancels_30d);
  }

  const total = scoredStores.length;
  const start = (page - 1) * limit;
  const paginated = scoredStores.slice(start, start + limit);

  return NextResponse.json({
    data: paginated,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
    meta: {
      rule_id: 'BUS-003,BUS-004',
      rule_version: 'v1',
      confidence: 'HIGH',
      warnings: [],
      synthetic: true,
    },
  });
}
