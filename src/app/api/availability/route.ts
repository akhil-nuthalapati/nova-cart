import { NextResponse } from 'next/server';
import { UpdateAvailabilityRequestSchema } from '../../../api/contracts';
import { computeSRS } from '../../../domain/reliability';
import { prioritizeNudges } from '../../../domain/nudges';
import { RULES_V1 } from '../../../config/rules.v1';
import { storesRepo, ordersRepo, inventoryRepo } from '../../../server/repositories';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('store_id');

  if (!storeId) return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });

  const store = await storesRepo.getStoreById(storeId);
  const orderStats = await ordersRepo.getStoreOrderStats([storeId]);
  const stats = orderStats[0] || {
    total_orders: 0,
    unavail_cancels: 0,
    reject_cancels: 0,
    inventory_cancels: 0,
    unavail_rate: 0,
    reject_rate: 0,
  };

  const hours = store?.last_confirmed_hours_ago ?? 36;
  const r_stale = Math.min(1, hours / RULES_V1.staleness.critical_after_h);

  // Calculate SRS
  const srsResult = computeSRS(
    {
      r_stale,
      store_unavail_rate: stats.unavail_rate,
      store_reject_rate: stats.reject_rate,
      orders_in_window: stats.total_orders,
    },
    RULES_V1.srs
  );

  const items = await inventoryRepo.getStoreItems(storeId);
  const nudgeItems = items.map((i, idx) => ({
    item_id: i.item_id,
    item_name: i.item_name,
    demand_score: i.demand_score ?? Math.max(5, 25 - idx * 2),
    hours_since_confirmed: i.hours_since_confirmed ?? hours,
  }));

  const nudges = prioritizeNudges({ items: nudgeItems }, RULES_V1.nudge, RULES_V1.staleness);

  return NextResponse.json({
    srs: srsResult.srs,
    band: srsResult.band,
    nudges,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = UpdateAvailabilityRequestSchema.parse(body);

    const idempotencyKey = `avail-update-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await inventoryRepo.insertStockConfirmation(
      data.store_id,
      data.item_id,
      data.is_available,
      idempotencyKey
    );

    return NextResponse.json({ success: true, updated: data });
  } catch (err: unknown) {
    const errorObj = err as { errors?: unknown };
    return NextResponse.json({ error: errorObj.errors || 'Invalid payload' }, { status: 400 });
  }
}
