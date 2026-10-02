import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeSRS } from '../../../../../domain/reliability';
import { RULES_V1 } from '../../../../../config/rules.v1';
import { storesRepo, ordersRepo, inventoryRepo } from '../../../../../server/repositories';

// In-memory idempotency cache for fast response matching
const idempotencyCache = new Map<string, unknown>();

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
 * Purpose: Writes stock confirmation, resets staleness to 0h, and recalculates SRS
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

    // Idempotency check (ARCH-007 / TEST-API-05-IDEM)
    const cacheKey = `${store_id}:${idempotencyKey}`;
    if (idempotencyCache.has(cacheKey)) {
      return NextResponse.json(idempotencyCache.get(cacheKey));
    }

    const store = await storesRepo.getStoreById(store_id);
    if (!store) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Store with ID ${store_id} not found` } },
        { status: 404 }
      );
    }

    // Validate the entire batch before any writes or freshness changes.
    const storeItems = await inventoryRepo.getStoreItems(store_id);
    const validItemIds = new Set(storeItems.map((item) => item.item_id));
    const invalidItemIds = items
      .filter((item) => !validItemIds.has(item.itemId))
      .map((item) => item.itemId);
    if (invalidItemIds.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Every item must belong to the requested store',
            details: { invalidItemIds },
          },
        },
        { status: 400 }
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

    // Before SRS (using previous staleness)
    const previousHours = store.last_confirmed_hours_ago ?? 48;
    const r_stale_before = Math.min(1, previousHours / RULES_V1.staleness.critical_after_h);
    const beforeResult = computeSRS(
      {
        r_stale: r_stale_before,
        store_unavail_rate: stats.unavail_rate,
        store_reject_rate: stats.reject_rate,
        orders_in_window: stats.total_orders,
      },
      RULES_V1.srs
    );

    // After SRS (confirmation resets staleness to 0h fresh)
    const r_stale_after = 0;
    const afterResult = computeSRS(
      {
        r_stale: r_stale_after,
        store_unavail_rate: stats.unavail_rate,
        store_reject_rate: stats.reject_rate,
        orders_in_window: stats.total_orders,
      },
      RULES_V1.srs
    );

    // Only report success after every write succeeds. Earlier writes may persist
    // if a later item fails; never cache a successful response for that batch.
    for (const item of items) {
      await inventoryRepo.insertStockConfirmation(
        store_id,
        item.itemId,
        item.inStock,
        `${idempotencyKey}:${item.itemId}`
      );
    }

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record stock confirmation';
    return NextResponse.json(
      { error: { code: 'INTERNAL', message } },
      { status: 500 }
    );
  }
}
