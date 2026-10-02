import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getReliability } from '../../src/app/api/stores/reliability/route';
import { GET as getNudges } from '../../src/app/api/stores/[store_id]/nudges/route';
import { inventoryRepo, ordersRepo, storesRepo } from '../../src/server/repositories';
import { getServerSupabase } from '../../src/lib/supabase';

vi.mock('../../src/lib/supabase', () => ({
  isDemoStatic: () => false,
  getServerSupabase: vi.fn(),
}));

const stores = ['fresh', 'stale', 'unknown'].map((id) => ({
  id,
  name: id,
  category: 'grocery',
  active: true,
  cities: { name: 'City A' },
}));

function mockDatabase(freshnessError: string | null = null) {
  const from = vi.fn((table: string) => {
    let id: string | undefined;
    const result = () => table === 'stores'
      ? { data: id ? stores.find((store) => store.id === id) : stores, error: null }
      : {
        data: [
          { store_id: 'fresh', avg_hours_since_confirmed: 0, total_items: 2, in_stock_count: 1 },
          { store_id: 'stale', avg_hours_since_confirmed: 60, total_items: 2, in_stock_count: 2 },
        ],
        error: freshnessError ? { message: freshnessError } : null,
      };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((column: string, value: string) => {
        if (column === 'id') id = value;
        return query;
      }),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(async () => result()),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
  vi.mocked(getServerSupabase).mockReturnValue({ from } as unknown as ReturnType<typeof getServerSupabase>);
  return from;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  mockDatabase();
  vi.spyOn(ordersRepo, 'getStoreOrderStats').mockResolvedValue(stores.map((store) => ({
    store_id: store.id,
    total_orders: 100,
    total_cancelled: 0,
    unavail_cancels: 0,
    reject_cancels: 0,
    inventory_cancels: 0,
    unavail_rate: 0,
    reject_rate: 0,
  })));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Store freshness with Supabase data', () => {
  it('scores and sorts stores using their measured freshness, with a conservative unknown fallback', async () => {
    const response = await getReliability(new Request('http://localhost/api/stores/reliability'));
    const { data } = await response.json();
    expect(data.map((store: { store_id: string }) => store.store_id)).toEqual(['unknown', 'stale', 'fresh']);
    expect(data.map((store: { last_confirmed_hours_ago: number }) => store.last_confirmed_hours_ago))
      .toEqual([72, 60, 0]);
    expect(data.map((store: { srs: number }) => store.srs)).toEqual([60, 67, 100]);
  });

  it('hydrates freshness when retrieving one store', async () => {
    expect((await storesRepo.getStoreById('stale'))?.last_confirmed_hours_ago).toBe(60);
  });

  it('does not replace failed freshness reads with a fabricated score', async () => {
    mockDatabase('database unavailable');
    await expect(getReliability(new Request('http://localhost/api/stores/reliability')))
      .rejects.toThrow('Store freshness failed: database unavailable');
  });

  it('excludes recently confirmed items and ranks stale items using measured demand and timestamps', async () => {
    const timestamps = [
      ['recent', '2026-10-02T11:00:00Z'],
      ['old', '2026-09-30T12:00:00Z'],
      ['never', null],
      ['no-orders', null],
      ['future', '2026-10-03T12:00:00Z'],
    ] as const;
    vi.spyOn(inventoryRepo, 'getStoreItems').mockResolvedValue(timestamps.map(([id, timestamp]) => ({
      store_id: 'fresh', item_id: id, item_name: id, category: 'grocery', in_stock: true,
      last_confirmed_at: timestamp,
    })));
    const demand = vi.spyOn(inventoryRepo, 'getItemDemandCounts').mockResolvedValue(new Map([
      ['recent', 100], ['old', 20], ['never', 5], ['future', 100],
    ]));
    const response = await getNudges(new Request('http://localhost/api/stores/fresh/nudges'), {
      params: Promise.resolve({ store_id: 'fresh' }),
    });
    const { data } = await response.json();
    expect(data.srs).toBe(100);
    expect(data.last_confirmed_hours_ago).toBe(0);
    expect(data.nudges.map((item: { item_id: string }) => item.item_id)).toEqual(['old', 'never', 'no-orders']);
    expect(data.nudges.map((item: { hours_since_confirmed: number }) => item.hours_since_confirmed))
      .toEqual([48, 72, 72]);
    expect(data.nudges.map((item: { demand_score: number }) => item.demand_score)).toEqual([20, 5, 0]);
    expect(demand).toHaveBeenCalledWith('fresh', 7);
  });
});
