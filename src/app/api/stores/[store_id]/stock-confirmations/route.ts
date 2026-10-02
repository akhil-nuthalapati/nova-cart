import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeSRS } from '../../../../../domain/reliability';
import { RULES_V1 } from '../../../../../config/rules.v1';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// In-memory idempotency cache for demo
const idempotencyCache = new Map<string, any>();

const StockConfirmationSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      inStock: z.boolean(),
    })
  ).min(1),
  idempotencyKey: z.string().min(1),
});

/**
 * API-05: POST /api/stores/{store_id}/stock-confirmations
 * Roles: owner(own), pm
 * Purpose: Writes stock confirmation, resets staleness to 0h, and recalculates SRS
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ store_id: string }> }
) {
  try {
    const { store_id } = await params;
    const body = await request.json();

    const parsed = StockConfirmationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid stock confirmation request payload',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { items, idempotencyKey } = parsed.data;

    // Idempotency check (ARCH-007 / TEST-API-05-IDEM)
    const cacheKey = `${store_id}:${idempotencyKey}`;
    if (idempotencyCache.has(cacheKey)) {
      return NextResponse.json(idempotencyCache.get(cacheKey));
    }

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

    // Before SRS (using previous staleness)
    const previousHours = store.last_confirmed_hours_ago ?? 48;
    const r_stale_before = Math.min(1, previousHours / RULES_V1.staleness.critical_after_h);
    const beforeResult = computeSRS(
      {
        r_stale: r_stale_before,
        store_unavail_rate: total > 0 ? unavail / total : 0,
        store_reject_rate: total > 0 ? reject / total : 0,
        orders_in_window: total,
      },
      RULES_V1.srs
    );

    // After SRS (confirmation resets staleness to 0h fresh)
    const r_stale_after = 0; // Fresh confirmation!
    const afterResult = computeSRS(
      {
        r_stale: r_stale_after,
        store_unavail_rate: total > 0 ? unavail / total : 0,
        store_reject_rate: total > 0 ? reject / total : 0,
        orders_in_window: total,
      },
      RULES_V1.srs
    );

    const responsePayload = {
      data: {
        store_id,
        idempotencyKey,
        items_confirmed_count: items.length,
        confirmed_at: new Date().toISOString(),
        before_srs: beforeResult.srs,
        before_band: beforeResult.band,
        after_srs: afterResult.srs,
        after_band: afterResult.band,
        srs_lift: afterResult.srs - beforeResult.srs,
      },
      meta: {
        rule_id: 'BUS-003,BUS-004',
        rule_version: 'v1',
        confidence: 'HIGH',
        warnings: [],
        synthetic: true,
      },
    };

    // Save to idempotency cache
    idempotencyCache.set(cacheKey, responsePayload);

    return NextResponse.json(responsePayload);
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to record stock confirmation' } },
      { status: 500 }
    );
  }
}
