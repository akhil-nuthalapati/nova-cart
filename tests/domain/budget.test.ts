import { describe, it, expect } from 'vitest';
import { computeBudgetGuard } from '../../src/domain/budget';
import { ConfidenceLevel, SRSBand } from '../../src/domain/types';

describe('BUS-012: Budget Guard', () => {
  it('TEST-BUS-012: Surfaces unresolved costs and checks MET-023 cap', () => {
    const interventions = [
      {
        store_id: 'store-1',
        store_name: 'Store 1',
        srs: 30,
        band: SRSBand.AT_RISK,
        recommended_action: 'Store visit',
        expected_avoided_orders: 50,
        confidence: ConfidenceLevel.MEDIUM,
        cost_estimate: 'DATA REQUIRED',
      },
      {
        store_id: 'store-2',
        store_name: 'Store 2',
        srs: 50,
        band: SRSBand.WATCH,
        recommended_action: 'Increase nudges',
        expected_avoided_orders: 20,
        confidence: ConfidenceLevel.HIGH,
        cost_estimate: '₹50000',
      },
    ];

    const result = computeBudgetGuard(interventions);

    expect(result.has_unresolved).toBe(true);
    expect(result.total_cost_unresolved).toBe(1);
    expect(result.total_cost_known).toBe(50000);
    expect(result.exceeds_cap).toBe(false);
    expect(result.cap).toBe(2500000); // ₹25L

    // DER-009 conflict warning must be present
    expect(result.warnings.some((w) => w.includes('DER-009'))).toBe(true);
  });

  it('flags warning when budget exceeds ₹25L cap', () => {
    const interventions = [
      {
        store_id: 'store-1',
        store_name: 'Store 1',
        srs: 20,
        band: SRSBand.AT_RISK,
        recommended_action: 'Custom hardware terminal',
        expected_avoided_orders: 200,
        confidence: ConfidenceLevel.HIGH,
        cost_estimate: '₹2600000',
      },
    ];

    const result = computeBudgetGuard(interventions);
    expect(result.exceeds_cap).toBe(true);
    expect(result.warnings.some((w) => w.includes('exceeds ₹25L'))).toBe(true);
  });
});
