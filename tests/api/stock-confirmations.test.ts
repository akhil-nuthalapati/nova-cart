import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../src/app/api/stores/[store_id]/stock-confirmations/route';
import { inventoryRepo, storesRepo } from '../../src/server/repositories';
import { invalidateDemoCache } from '../../src/server/db/json-store';

function confirm(body: unknown, storeId = 'store-1') {
  return POST(new Request('http://localhost/api/stock-confirmations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ store_id: storeId }) });
}

beforeEach(() => {
  vi.stubEnv('DEMO_STATIC', '1');
  invalidateDemoCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  invalidateDemoCache();
});

describe('Stock confirmation API', () => {
  it('returns 400 for malformed JSON', async () => {
    const response = await POST(new Request('http://localhost/api/stock-confirmations', {
      method: 'POST',
      body: '{',
    }), { params: Promise.resolve({ store_id: 'store-1' }) });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it.each(['missing-item', 'store-2-item-1'])(
    'rejects %s before writing any items or improving freshness', async (invalidItemId) => {
      const before = await storesRepo.getStoreById('store-1');
      const insert = vi.spyOn(inventoryRepo, 'insertStockConfirmation');
      const response = await confirm({
        items: [
          { itemId: 'store-1-item-1', inStock: true },
          { itemId: invalidItemId, inStock: false },
        ],
        idempotencyKey: `invalid-${invalidItemId}`,
      });
      expect(response.status).toBe(400);
      expect(insert).not.toHaveBeenCalled();
      expect(await storesRepo.getStoreById('store-1')).toEqual(before);
    }
  );

  it('rejects duplicate items before writing', async () => {
    const insert = vi.spyOn(inventoryRepo, 'insertStockConfirmation');
    const response = await confirm({
      items: [
        { itemId: 'store-1-item-1', inStock: true },
        { itemId: 'store-1-item-1', inStock: false },
      ],
      idempotencyKey: 'duplicate-items',
    });
    expect(response.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing store', async () => {
    const response = await confirm({
      items: [{ itemId: 'store-1-item-1', inStock: true }],
      idempotencyKey: 'missing-store',
    }, 'missing');
    expect(response.status).toBe(404);
  });

  it('reports a write failure and does not cache a successful response', async () => {
    const insert = vi.spyOn(inventoryRepo, 'insertStockConfirmation')
      .mockRejectedValueOnce(new Error('Database unavailable'));
    const body = {
      items: [{ itemId: 'store-1-item-1', inStock: true }],
      idempotencyKey: 'failed-write-retry',
    };
    const failed = await confirm(body);
    expect(failed.status).toBe(500);
    expect(await failed.json()).not.toHaveProperty('data');
    const retried = await confirm(body);
    expect(retried.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('does not report a whole batch as successful when its second write fails', async () => {
    const original = inventoryRepo.insertStockConfirmation;
    vi.spyOn(inventoryRepo, 'insertStockConfirmation')
      .mockImplementationOnce(original)
      .mockRejectedValueOnce(new Error('Second write failed'));
    const response = await confirm({
      items: [
        { itemId: 'store-1-item-1', inStock: true },
        { itemId: 'store-1-item-2', inStock: false },
      ],
      idempotencyKey: 'partial-failure',
    });
    expect(response.status).toBe(500);
    expect(await response.json()).not.toHaveProperty('data');
  });

  it('confirms valid items and replays a successful request without writing again', async () => {
    const insert = vi.spyOn(inventoryRepo, 'insertStockConfirmation');
    const body = {
      items: [{ itemId: 'store-1-item-1', inStock: true }],
      idempotencyKey: 'valid-confirmation',
    };
    const response = await confirm(body);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.items_confirmed_count).toBe(1);
    expect((await storesRepo.getStoreById('store-1'))?.last_confirmed_hours_ago).toBe(0);
    expect(await (await confirm(body)).json()).toEqual(payload);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
