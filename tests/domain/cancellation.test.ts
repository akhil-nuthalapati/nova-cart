import { describe, it, expect } from 'vitest';
import { computeCancellationBreakdown, validateCancellationInput } from '../../src/domain/cancellation';
import { CANCELLATION_REASON_SHARES } from '../../src/domain/types';

describe('BUS-002: Cancellation Decomposition', () => {
  it('GOLD-01: Correctly decomposes cancellations', () => {
    const result = computeCancellationBreakdown({
      total_orders: 38500,
      cancellation_rate: 0.11,
      reason_shares: CANCELLATION_REASON_SHARES,
    });

    expect(result.total_cancelled).toBe(4235);
    expect(result.by_reason.unavailable).toBe(1482);
    expect(result.by_reason.customer_delay).toBe(1143);
    expect(result.by_reason.store_rejected).toBe(762);
    expect(result.by_reason.partner_unavailable).toBe(508);
    expect(result.by_reason.other).toBe(339);
    expect(result.inventory_side_count).toBe(2244);
    // 2244 / 38500 ≈ 0.05828 (5.8%)
    expect(result.inventory_side_share_of_orders).toBeCloseTo(0.0583, 3);
  });

  it('BUS-014: Blocks invalid shares', () => {
    const invalidShares = { ...CANCELLATION_REASON_SHARES, unavailable: 90 };
    const issues = validateCancellationInput({
      total_orders: 100,
      cancellation_rate: 0.1,
      reason_shares: invalidShares,
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toBe('reason_shares');
  });
});
