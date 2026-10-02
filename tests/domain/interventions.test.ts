import { describe, it, expect } from 'vitest';
import { generateInterventions } from '../../src/domain/interventions';
import { SRSBand } from '../../src/domain/types';

describe('BUS-008: Ops Intervention List', () => {
  it('TEST-BUS-008: Ranks stores by expected avoidable cancels with honest costs', () => {
    const stores = [
      {
        store_id: 'store-1',
        store_name: 'Store 1',
        srs: 35,
        band: SRSBand.AT_RISK,
        store_inventory_cancels_30d: 80,
        last_confirmed_hours_ago: 84,
      },
      {
        store_id: 'store-2',
        store_name: 'Store 2',
        srs: 55,
        band: SRSBand.WATCH,
        store_inventory_cancels_30d: 20,
        last_confirmed_hours_ago: 36,
      },
      {
        store_id: 'store-3',
        store_name: 'Store 3',
        srs: 90,
        band: SRSBand.HEALTHY,
        store_inventory_cancels_30d: 2,
        last_confirmed_hours_ago: 10,
      },
    ];

    const result = generateInterventions(stores, 0.25, 10);

    expect(result.length).toBe(3);
    // Highest avoidable cancels first: store-1 (80 * 0.25 = 20)
    expect(result[0].store_id).toBe('store-1');
    expect(result[0].expected_avoided_orders).toBe(20);
    expect(result[0].cost_estimate).toBe('DATA REQUIRED');
    expect(result[0].recommended_action).toContain('Urgent: Partner Ops call');

    // Second: store-2 (20 * 0.25 = 5)
    expect(result[1].store_id).toBe('store-2');
    expect(result[1].expected_avoided_orders).toBe(5);
    expect(result[1].cost_estimate).toBe('₹0 incremental');
  });
});
