import { describe, it, expect } from 'vitest';
import { computeStaleness, computeSRS } from '../../src/domain/reliability';
import { RULES_V1 } from '../../src/config/rules.v1';
import { StaleBand, SRSBand } from '../../src/domain/types';

describe('BUS-003: Stock Staleness', () => {
  it('GOLD-06: Evaluates staleness bands correctly', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    
    // 24.00 h = FRESH
    const d24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const r24 = computeStaleness(d24, now, RULES_V1.staleness);
    expect(r24.band).toBe(StaleBand.FRESH);

    // 24.01 h = STALE
    const d2401 = new Date(now.getTime() - (24 * 60 * 60 * 1000 + 10000));
    const r2401 = computeStaleness(d2401, now, RULES_V1.staleness);
    expect(r2401.band).toBe(StaleBand.STALE);

    // 72.00 h = STALE
    const d72 = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const r72 = computeStaleness(d72, now, RULES_V1.staleness);
    expect(r72.band).toBe(StaleBand.STALE);

    // 72.01 h = CRITICAL
    const d7201 = new Date(now.getTime() - (72 * 60 * 60 * 1000 + 10000));
    const r7201 = computeStaleness(d7201, now, RULES_V1.staleness);
    expect(r7201.band).toBe(StaleBand.CRITICAL);
  });
});

describe('BUS-004: Store Reliability Score (SRS)', () => {
  it('GOLD-07: Standard benchmarks', () => {
    // 36h, 3.85%, 0%
    const r36 = computeSRS({
      r_stale: 36 / 72,
      store_unavail_rate: 0.0385,
      store_reject_rate: 0,
      orders_in_window: 100,
    }, RULES_V1.srs);
    // stale: 0.4 * 0.5 = 0.2
    // unavail: 0.4 * (0.0385 / (2 * 0.0385)) = 0.4 * 0.5 = 0.2
    // reject: 0
    // risk = 0.4; srs = 60
    expect(r36.srs).toBe(60);
    expect(r36.band).toBe(SRSBand.WATCH);

    // 0h, 0%, 0%
    const rBest = computeSRS({
      r_stale: 0, store_unavail_rate: 0, store_reject_rate: 0, orders_in_window: 100
    }, RULES_V1.srs);
    expect(rBest.srs).toBe(100);

    // ≥72h, ≥2x baseline
    const rWorst = computeSRS({
      r_stale: 1, store_unavail_rate: 0.1, store_reject_rate: 0.1, orders_in_window: 100
    }, RULES_V1.srs);
    expect(rWorst.srs).toBe(0);
    expect(rWorst.band).toBe(SRSBand.AT_RISK);
  });

  it('GOLD-08: Band boundaries', () => {
    // Manually force risks to hit exact SRS boundaries
    // risk = 0.20 -> srs = 80
    const r80 = computeSRS({ r_stale: 0.5, store_unavail_rate: 0, store_reject_rate: 0, orders_in_window: 100 }, RULES_V1.srs);
    expect(r80.srs).toBe(80);
    expect(r80.band).toBe(SRSBand.HEALTHY);
  });
});
