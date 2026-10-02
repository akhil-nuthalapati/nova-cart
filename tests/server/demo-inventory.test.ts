import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmStockBatch, getStoreFreshness, getStoreItems } from '../../src/server/repositories/inventory.repo';
import { invalidateDemoCache } from '../../src/server/db/json-store';

beforeEach(() => {
  vi.stubEnv('DEMO_STATIC', '1');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-02T08:00:00Z'));
  invalidateDemoCache();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); invalidateDemoCache(); });

describe('Demo per-item inventory', () => {
  it('retains stock and timestamps, ages confirmations, and leaves unrelated items unchanged', async () => {
    const before = await getStoreItems('store-1');
    const result = await confirmStockBatch('store-1', [{ itemId: before[0].item_id, inStock: false }], 'key');
    const after = await getStoreItems('store-1');
    expect(after[0].in_stock).toBe(false);
    expect(after[0].hours_since_confirmed).toBe(0);
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(result.after_hours).toBeGreaterThan(0);
    expect(result.after_hours).toBeLessThan(result.before_hours);
    expect((await getStoreFreshness(['store-1']))[0].in_stock_count).toBe(9);
    vi.advanceTimersByTime(3600000);
    expect((await getStoreItems('store-1'))[0].hours_since_confirmed).toBe(1);
  });

  it('validates a whole batch before writing and allows a corrected retry', async () => {
    const before = await getStoreItems('store-1');
    await expect(confirmStockBatch('store-1', [
      { itemId: before[0].item_id, inStock: false }, { itemId: 'missing', inStock: true },
    ], 'retry')).rejects.toThrow('INVALID_CONFIRMATION_ITEM');
    expect(await getStoreItems('store-1')).toEqual(before);
    await expect(confirmStockBatch('store-1', [{ itemId: before[0].item_id, inStock: false }], 'retry'))
      .resolves.toBeDefined();
  });

  it('replays concurrent identical requests without refreshing or overwriting later changes', async () => {
    const items = [{ itemId: 'store-1-item-1', inStock: false }];
    const [first, second] = await Promise.all([
      confirmStockBatch('store-1', items, 'same'), confirmStockBatch('store-1', items, 'same'),
    ]);
    expect(second).toEqual(first);
    vi.advanceTimersByTime(3600000);
    await confirmStockBatch('store-1', [{ ...items[0], inStock: true }], 'new');
    expect(await confirmStockBatch('store-1', items, 'same')).toEqual(first);
    expect((await getStoreItems('store-1'))[0].in_stock).toBe(true);
  });

  it('scopes request keys to a store', async () => {
    await confirmStockBatch('store-1', [{ itemId: 'store-1-item-1', inStock: false }], 'shared');
    await expect(confirmStockBatch('store-2', [{ itemId: 'store-2-item-1', inStock: false }], 'shared'))
      .resolves.toBeDefined();
  });
});
