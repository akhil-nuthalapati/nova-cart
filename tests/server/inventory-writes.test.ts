import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmStockBatch, insertStockConfirmation } from '../../src/server/repositories/inventory.repo';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({
  isDemoStatic: () => false,
  getServerSupabase: () => ({ rpc }),
}));
beforeEach(() => vi.resetAllMocks());

describe('Supabase atomic inventory writes', () => {
  it('sends the whole batch to one transaction and preserves the retry key on failure', async () => {
    const items = [{ itemId: 'item-2', inStock: false }, { itemId: 'item-1', inStock: true }];
    const result = { confirmations: [{ id: 'confirmation-1' }], before_hours: 40, after_hours: 10 };
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Update denied' } })
      .mockResolvedValueOnce({ data: result, error: null });
    await expect(confirmStockBatch('store-1', items, 'key')).rejects.toThrow('Update denied');
    await expect(confirmStockBatch('store-1', items, 'key')).resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
    expect(rpc).toHaveBeenCalledWith('confirm_stock_batch', {
      p_store_id: 'store-1', p_items: [items[1], items[0]], p_idempotency_key: 'key', p_confirmed_by: null, p_score_context: null,
    });
  });

  it('uses the transaction for single-item callers too', async () => {
    rpc.mockResolvedValue({ data: { confirmations: [{ id: 'confirmation-1' }] }, error: null });
    await expect(insertStockConfirmation('store-1', 'item-1', false, 'key'))
      .resolves.toEqual({ id: 'confirmation-1' });
  });

  it('propagates payload conflicts and rejects empty results', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'IDEMPOTENCY_CONFLICT' } })
      .mockResolvedValueOnce({ data: null, error: null });
    await expect(insertStockConfirmation('store-1', 'item-1', false, 'key')).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    await expect(insertStockConfirmation('store-1', 'item-1', false, 'key')).rejects.toThrow('no result');
  });
});
