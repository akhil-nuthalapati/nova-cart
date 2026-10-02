import { NextResponse } from 'next/server';
import { GetAvailabilityRequestSchema, UpdateAvailabilityRequestSchema } from '../../../api/contracts';
import { computeSRS } from '../../../domain/reliability';
import { prioritizeNudges } from '../../../domain/nudges';
import { RULES_V1 } from '../../../config/rules.v1';
import fs from 'fs';
import path from 'path';

// Helper to read local mock DB
function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('store_id');
  
  if (!storeId) return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  
  const db = getDB();
  // Filter mock data for the store
  const storeOrders = db.orders.filter((o: any) => o.store_id === storeId);
  const total = storeOrders.length;
  
  const unavail = storeOrders.filter((o: any) => o.cancellation_reason === 'unavailable').length;
  const reject = storeOrders.filter((o: any) => o.cancellation_reason === 'store_rejected').length;

  // Calculate SRS
  const srsResult = computeSRS({
    r_stale: 0.5, // Mock value, in real app derived from inventory table
    store_unavail_rate: total > 0 ? unavail / total : 0,
    store_reject_rate: total > 0 ? reject / total : 0,
    orders_in_window: total,
  }, RULES_V1.srs);

  // Mock Nudges (since we didn't seed inventory items)
  const items = [
    { item_id: 'i-1', item_name: 'Avocado', demand_score: 15, hours_since_confirmed: 48 },
    { item_id: 'i-2', item_name: 'Organic Milk', demand_score: 8, hours_since_confirmed: 36 },
  ];

  const nudges = prioritizeNudges({ items }, RULES_V1.nudge, RULES_V1.staleness);

  return NextResponse.json({
    srs: srsResult.srs,
    band: srsResult.band,
    nudges
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = UpdateAvailabilityRequestSchema.parse(body);

    // In a real app: update inventory table
    // For demo, we just return success
    return NextResponse.json({ success: true, updated: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.errors || 'Invalid payload' }, { status: 400 });
  }
}
