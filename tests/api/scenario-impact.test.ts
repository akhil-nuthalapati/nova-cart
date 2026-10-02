import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../src/app/api/scenarios/impact/route';
import { ordersRepo, ticketsRepo } from '../../src/server/repositories';

beforeEach(() => {
  vi.stubEnv('DEMO_STATIC', '1');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Impact scenario API', () => {
  it.each([
    [0, 0, 0, 0],
    [0, 1121, 0, 280],
    [2244, 0, 561, 0],
    [2244, 1121, 561, 280],
  ])('preserves measured counts (%i cancellations, %i tickets)', async (
    cancellations, tickets, recoveredOrders, ticketsAvoided,
  ) => {
    vi.spyOn(ordersRepo, 'getInventoryCancellationCount').mockResolvedValue(cancellations);
    vi.spyOn(ticketsRepo, 'getTicketCountByCategory').mockResolvedValue(tickets);

    const response = await POST(new Request('http://localhost/api/scenarios/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reduction: 0.25 }),
    }));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.baseline_inventory_cancels).toBe(cancellations);
    expect(data.recovered_orders).toBe(recoveredOrders);
    expect(data.tickets_avoided).toBe(ticketsAvoided);
    if (cancellations === 0) {
      expect(data.gmv_recovered).toBe(0);
      expect(data.revenue_recovered).toBe(0);
    }
  });
});
