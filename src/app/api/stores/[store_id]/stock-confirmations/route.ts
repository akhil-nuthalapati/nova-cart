import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeSRS } from '../../../../../domain/reliability';
import { RULES_V1 } from '../../../../../config/rules.v1';
import { storesRepo, ordersRepo, inventoryRepo } from '../../../../../server/repositories';

const StockConfirmationSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      inStock: z.boolean(),
    })
  ).min(1).refine(
    (items) => new Set(items.map((item) => item.itemId)).size === items.length,
    { message: 'Each item may only be confirmed once per request' }
  ),
  idempotencyKey: z.string().min(1),
});

/**
 * API-05: POST /api/stores/{store_id}/stock-confirmations
 * Roles: owner(own), pm
 * Purpose: Atomically confirms selected items and recalculates whole-store SRS
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ store_id: string }> }
) {
  try {
    const { store_id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch (err: unknown) {
      if (!(err instanceof SyntaxError)) throw err;
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } },
        { status: 400 }
      );
    }

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

    const batch = await inventoryRepo.confirmStockBatch(store_id, items, idempotencyKey, undefined, {
      total_orders: stats.total_orders,
      unavail_rate: stats.unavail_rate,
      reject_rate: stats.reject_rate,
    });
    // Replays use the original score inputs, even when order statistics have changed.
    const scoreStats = batch.score_context ?? stats;

    // Use actual whole-store freshness on both sides of the committed batch.
    const previousHours = batch.before_hours;
    const r_stale_before = Math.min(1, previousHours / RULES_V1.staleness.critical_after_h);
    const beforeResult = computeSRS(
      {
        r_stale: r_stale_before,
        store_unavail_rate: scoreStats.unavail_rate,
        store_reject_rate: scoreStats.reject_rate,
        orders_in_window: scoreStats.total_orders,
      },
      RULES_V1.srs
    );

    // Unconfirmed items keep their age after a partial confirmation.
    const r_stale_after = Math.min(1, batch.after_hours / RULES_V1.staleness.critical_after_h);
    const afterResult = computeSRS(
      {
        r_stale: r_stale_after,
        store_unavail_rate: scoreStats.unavail_rate,
        store_reject_rate: scoreStats.reject_rate,
        orders_in_window: scoreStats.total_orders,
      },
      RULES_V1.srs
    );

    const responsePayload = {
      data: {
        store_id,
        idempotencyKey,
        items_confirmed_count: items.length,
        confirmed_at: batch.confirmations[0].created_at,
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

    return NextResponse.json(responsePayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record stock confirmation';
    const conflict = message.includes('IDEMPOTENCY_CONFLICT');
    const invalid = message.includes('INVALID_CONFIRMATION');
    return NextResponse.json(
      { error: { code: conflict ? 'IDEMPOTENCY_CONFLICT' : invalid ? 'VALIDATION_ERROR' : 'INTERNAL', message } },
      { status: conflict ? 409 : invalid ? 400 : 500 }
    );
  }
}
