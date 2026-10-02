import { describe, it, expect } from 'vitest';
import { computeScenario } from '../../src/domain/scenario';

describe('BUS-009: Impact Scenario', () => {
  it('GOLD-04/04b/04c: Calculates impact scenarios correctly', () => {
    const baseline = {
      inventory_cancels: 2245,
      aov: 486,
      revenue_per_order: 67.79, // DER-011
      tickets_for_unavailable: 1121,
    };

    // GOLD-04c: r=0
    const r0 = computeScenario({ reduction: 0, ...baseline });
    expect(r0.recovered_orders).toBe(0);
    expect(r0.gmv_recovered).toBe(0);
    expect(r0.revenue_recovered).toBe(0);

    // GOLD-04c: r=1
    const r1 = computeScenario({ reduction: 1, ...baseline });
    expect(r1.recovered_orders).toBe(2245);

    // GOLD-04: r=0.25
    const r25 = computeScenario({ reduction: 0.25, ...baseline });
    expect(r25.recovered_orders).toBe(561); // Math.round(2245 * 0.25) = 561.25 -> 561
    expect(r25.gmv_recovered).toBe(561 * 486); // 272646 (~2.73L)
    expect(r25.revenue_recovered).toBeCloseTo(561 * 67.79); // ~38030 (~0.38L)
    expect(r25.tickets_avoided).toBe(280); // Math.round(1121 * 0.25) = 280.25 -> 280

    // GOLD-04b: r=0.50
    const r50 = computeScenario({ reduction: 0.50, ...baseline });
    expect(r50.recovered_orders).toBe(1123); // 2245 * 0.5 = 1122.5 -> 1123
    // Wait, GOLD-04b says approx 1122. The test asks to verify the formula.
    // 1122.5 rounds to 1123 in JS. That's acceptable (+/- 1)
  });
});
