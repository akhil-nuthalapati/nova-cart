import { describe, it, expect } from 'vitest';
import { computeVerdict, computeSpendGate } from '../../src/domain/verdict';
import { BASELINE_SNAPSHOT, CURRENT_SNAPSHOT, Verdict, SpendGateDecision } from '../../src/domain/types';
import { RULES_V1 } from '../../src/config/rules.v1';

describe('BUS-001: Quality-of-Growth Verdict', () => {
  it('GOLD-05: Source data results in decline verdict', () => {
    const result = computeVerdict(BASELINE_SNAPSHOT, CURRENT_SNAPSHOT, RULES_V1.verdict);
    
    expect(result.verdict).toBe(Verdict.GROWTH_WITH_QUALITY_DECLINE);
    expect(result.worse_count).toBe(5);

    const checkMetric = (id: string, worse: boolean, dir: string) => {
      const m = result.guardrail_metrics.find(x => x.id === id) || result.growth_metrics.find(x => x.id === id);
      expect(m).toBeDefined();
      expect(m?.worse).toBe(worse);
      expect(m?.direction).toBe(dir);
    };

    checkMetric('MET-005', true, 'down'); // Repeat rate fell
    checkMetric('MET-006', true, 'up'); // Delivery time rose
    checkMetric('MET-007', true, 'up'); // Cancel rate rose
    checkMetric('DER-008', true, 'up'); // Tickets per order rose
    checkMetric('DER-001', true, 'up'); // Promo / Rev rose
  });

  it('GOLD-02: Promo / Revenue derived values', () => {
    const result = computeVerdict(BASELINE_SNAPSHOT, CURRENT_SNAPSHOT, RULES_V1.verdict);
    const m9d = result.guardrail_metrics.find(x => x.id === 'DER-001')!;
    
    expect(m9d.baseline).toBeCloseTo(0.4357, 3); // 43.6%
    expect(m9d.current).toBeCloseTo(0.6513, 3); // 65.1%
  });
});

describe('BUS-010: Marketing Spend Gate', () => {
  it('GOLD-10: Restricts spend if verdict is decline', () => {
    const result = computeSpendGate(Verdict.GROWTH_WITH_QUALITY_DECLINE, 510000, 0.57);
    
    expect(result?.decision).toBe(SpendGateDecision.HOLD_INCREMENTAL_ACQUISITION);
    // Explicitly check for absence of causal wording as per spec
    expect(result?.why_matters).not.toMatch(/causes/i);
    expect(result?.why_matters).toMatch(/correlate/i);
  });
});
