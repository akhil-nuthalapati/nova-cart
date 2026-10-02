import { beforeEach, describe, expect, it, vi } from 'vitest';
import { insertStockConfirmation } from '../../src/server/repositories/inventory.repo';

const { from, confirmationResult, updateResult } = vi.hoisted(() => ({
  from: vi.fn(),
  confirmationResult: vi.fn(),
  updateResult: vi.fn(),
}));

vi.mock('../../src/lib/supabase', () => ({
  isDemoStatic: () => false,
  getServerSupabase: () => ({ from }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  const confirmations = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: confirmationResult,
  };
  const items = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: updateResult,
  };
  from.mockImplementation((table) => table === 'stock_confirmations' ? confirmations : items);
  confirmationResult.mockResolvedValue({ data: { id: 'confirmation-1' }, error: null });
  updateResult.mockResolvedValue({ data: { item_id: 'item-1' }, error: null });
});

describe('Supabase inventory write failures', () => {
  it('propagates confirmation insert errors', async () => {
    confirmationResult.mockResolvedValue({ data: null, error: { message: 'Insert denied' } });
    await expect(insertStockConfirmation('store-1', 'item-1', true, 'key'))
      .rejects.toThrow('Insert denied');
    expect(from).not.toHaveBeenCalledWith('store_items');
  });

  it('propagates inventory update errors after inserting a confirmation', async () => {
    updateResult.mockResolvedValue({ data: null, error: { message: 'Update denied' } });
    await expect(insertStockConfirmation('store-1', 'item-1', true, 'key'))
      .rejects.toThrow('Update denied');
  });

  it('rejects an inventory update that matches no item', async () => {
    updateResult.mockResolvedValue({ data: null, error: null });
    await expect(insertStockConfirmation('store-1', 'item-1', true, 'key'))
      .rejects.toThrow('Item no longer exists');
  });

  it('returns the confirmation only when the inventory update succeeds', async () => {
    await expect(insertStockConfirmation('store-1', 'item-1', false, 'key'))
      .resolves.toEqual({ id: 'confirmation-1' });
  });
});
