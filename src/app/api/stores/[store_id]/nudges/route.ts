import { NextResponse } from 'next/server';
import { prioritizeNudges } from '../../../../../domain/nudges';
import { computeSRS } from '../../../../../domain/reliability';
import { RULES_V1 } from '../../../../../config/rules.v1';
import { storesRepo, ordersRepo, inventoryRepo } from '../../../../../server/repositories';

/**
 * API-04: GET /api/stores/{store_id}/nudges
 * Roles: pm, owner
 * Purpose: BUS-007 Nudge prioritization for store owner one-tap confirmation
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ store_id: string }> }
) {
  const { store_id } = await params;

  const store = await storesRepo.getStoreById(store_id);
  if (!store) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Store with ID ${store_id} not found` } },
      { status: 404 }
    );
  }

  const orderStats = await ordersRepo.getStoreOrderStats([store_id]);
  const stats = orderStats[0] || {
    total_orders: 0,
    unavail_cancels: 0,
    reject_cancels: 0,
    inventory_cancels: 0,
    unavail_rate: 0,
    reject_rate: 0,
  };

  const hours = store.last_confirmed_hours_ago ?? 36;
  const r_stale = Math.min(1, hours / RULES_V1.staleness.critical_after_h);

  const srsResult = computeSRS(
    {
      r_stale,
      store_unavail_rate: stats.unavail_rate,
      store_reject_rate: stats.reject_rate,
      orders_in_window: stats.total_orders,
    },
    RULES_V1.srs
  );

  const storeItems = await inventoryRepo.getStoreItems(store_id);

  const nudgeItems = storeItems.map((item, idx) => ({
    item_id: item.item_id,
    item_name: item.item_name,
    demand_score: item.demand_score ?? Math.max(5, 30 - idx * 3),
    hours_since_confirmed: item.hours_since_confirmed ?? hours,
  }));

  const nudges = prioritizeNudges({ items: nudgeItems }, RULES_V1.nudge, RULES_V1.staleness);

  return NextResponse.json({
    data: {
      store_id: store.id,
      store_name: store.name,
      city: store.city_name,
      srs: srsResult.srs,
      band: srsResult.band,
      last_confirmed_hours_ago: hours,
      nudges,
    },
    meta: {
      rule_id: 'BUS-004,BUS-007',
      rule_version: 'v1',
      confidence: 'HIGH',
      warnings: [],
      synthetic: true,
    },
  });
}
