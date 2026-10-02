import { NextResponse } from 'next/server';
import { computeSRS } from '../../../../domain/reliability';
import { RULES_V1 } from '../../../../config/rules.v1';
import { storesRepo, ordersRepo } from '../../../../server/repositories';

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
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);

  const stores = await storesRepo.getStores({
    city: city || undefined,
    category: category || undefined,
  });

  const orderStats = await ordersRepo.getStoreOrderStats();
  const statsMap = new Map(orderStats.map((s) => [s.store_id, s]));

  // Compute SRS for each store
  let scoredStores = stores.map((store) => {
    const stats = statsMap.get(store.id) || {
      total_orders: 0,
      unavail_cancels: 0,
      reject_cancels: 0,
      inventory_cancels: 0,
      unavail_rate: 0,
      reject_rate: 0,
    };

    const hours = store.last_confirmed_hours_ago ?? RULES_V1.staleness.critical_after_h;
    const r_stale = Math.min(1, Math.max(0, hours / RULES_V1.staleness.critical_after_h));
    const unavail_rate = stats.unavail_rate;
    const reject_rate = stats.reject_rate;

    const srsResult = computeSRS(
      {
        r_stale,
        store_unavail_rate: unavail_rate,
        store_reject_rate: reject_rate,
        orders_in_window: stats.total_orders,
      },
      RULES_V1.srs
    );

    return {
      store_id: store.id,
      name: store.name,
      city: store.city_name,
      category: store.category,
      last_confirmed_hours_ago: hours,
      orders_30d: stats.total_orders,
      cancels_30d: stats.inventory_cancels,
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

  // Apply band filter
  if (band) {
    const b = band.toLowerCase();
    scoredStores = scoredStores.filter((s) => s.band.toLowerCase() === b);
  }

  // Sort with deterministic tie-break
  if (sort === 'srs_desc') {
    scoredStores.sort((a, b) => b.srs !== a.srs ? b.srs - a.srs : a.store_id.localeCompare(b.store_id));
  } else if (sort === 'cancels_desc') {
    scoredStores.sort((a, b) => b.cancels_30d !== a.cancels_30d ? b.cancels_30d - a.cancels_30d : a.store_id.localeCompare(b.store_id));
  } else {
    // default srs_asc
    scoredStores.sort((a, b) => a.srs !== b.srs ? a.srs - b.srs : a.store_id.localeCompare(b.store_id));
  }

  const total = scoredStores.length;
  const start = (page - 1) * limit;
  const paginated = scoredStores.slice(start, start + limit);

  return NextResponse.json(
    {
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
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=60',
      },
    }
  );
}
