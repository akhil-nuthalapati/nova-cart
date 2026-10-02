import { NextResponse } from 'next/server';
import { prioritizeNudges } from '../../../../../domain/nudges';
import { computeSRS } from '../../../../../domain/reliability';
import { RULES_V1 } from '../../../../../config/rules.v1';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

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
  const db = getDB();

  const store = (db.stores || []).find((s: any) => s.id === store_id);
  if (!store) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Store with ID ${store_id} not found` } },
      { status: 404 }
    );
  }

  const storeOrders = (db.orders || []).filter((o: any) => o.store_id === store_id);
  const total = storeOrders.length;
  const unavail = storeOrders.filter((o: any) => o.cancellation_reason === 'unavailable').length;
  const reject = storeOrders.filter((o: any) => o.cancellation_reason === 'store_rejected').length;

  const hours = store.last_confirmed_hours_ago ?? 36;
  const r_stale = Math.min(1, hours / RULES_V1.staleness.critical_after_h);

  const srsResult = computeSRS(
    {
      r_stale,
      store_unavail_rate: total > 0 ? unavail / total : 0,
      store_reject_rate: total > 0 ? reject / total : 0,
      orders_in_window: total,
    },
    RULES_V1.srs
  );

  // Generate realistic catalog items for nudges
  const sampleItems = [
    { item_id: `${store_id}-item-1`, item_name: 'Farm Fresh Whole Milk 1L', demand_score: 28, hours_since_confirmed: hours },
    { item_id: `${store_id}-item-2`, item_name: 'Brown Eggs (Pack of 12)', demand_score: 22, hours_since_confirmed: Math.max(12, hours - 5) },
    { item_id: `${store_id}-item-3`, item_name: 'Whole Wheat Bread 400g', demand_score: 18, hours_since_confirmed: hours + 6 },
    { item_id: `${store_id}-item-4`, item_name: 'Organic Bananas 1kg', demand_score: 16, hours_since_confirmed: hours + 12 },
    { item_id: `${store_id}-item-5`, item_name: 'Greek Yogurt 400g', demand_score: 14, hours_since_confirmed: Math.max(6, hours - 10) },
    { item_id: `${store_id}-item-6`, item_name: 'Salted Butter 500g', demand_score: 11, hours_since_confirmed: hours },
    { item_id: `${store_id}-item-7`, item_name: 'Cheddar Cheese Block 200g', demand_score: 9, hours_since_confirmed: hours + 8 },
    { item_id: `${store_id}-item-8`, item_name: 'Rolled Oats 1kg', demand_score: 7, hours_since_confirmed: hours + 16 },
  ];

  const nudges = prioritizeNudges({ items: sampleItems }, RULES_V1.nudge, RULES_V1.staleness);

  return NextResponse.json({
    data: {
      store_id: store.id,
      store_name: store.name,
      city: store.city,
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
