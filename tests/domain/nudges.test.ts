import { describe, it, expect } from 'vitest';
import { prioritizeNudges } from '../../src/domain/nudges';
import { RULES_V1 } from '../../src/config/rules.v1';

describe('BUS-007: Nudge Prioritisation', () => {
  it('correctly ranks items and excludes recently confirmed ones', () => {
    const items = [
      { item_id: '1', item_name: 'A', demand_score: 10, hours_since_confirmed: 5 }, // Excluded (<= 24h)
      { item_id: '2', item_name: 'B', demand_score: 5, hours_since_confirmed: 48 }, // Ratio 48/72=0.66 -> P = 3.33
      { item_id: '3', item_name: 'C', demand_score: 20, hours_since_confirmed: 36 }, // Ratio 36/72=0.50 -> P = 10
      { item_id: '4', item_name: 'D', demand_score: 10, hours_since_confirmed: 100 }, // Ratio = 1.0 (capped) -> P = 10
    ];

    const result = prioritizeNudges({ items }, RULES_V1.nudge, RULES_V1.staleness);
    
    expect(result).toHaveLength(3);
    
    // Both C and D have priority 10. Tie-break is by item_id ascending. '3' < '4'.
    expect(result[0].item_id).toBe('3');
    expect(result[1].item_id).toBe('4');
    expect(result[2].item_id).toBe('2');
  });
});
