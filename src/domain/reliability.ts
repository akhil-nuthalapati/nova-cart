/**
 * BUS-003 — Stock Staleness
 * BUS-004 — Store Reliability Score (SRS)
 * Pure functions. No I/O, no Date.now().
 */

import type { StalenessResult, SRSResult } from './types';
import { StaleBand, SRSBand } from './types';
import type { RulesV1 } from '../config/rules.v1';
import type { DataQualityIssue } from './types';

// ── BUS-003 — Stock Staleness ──

/**
 * Compute staleness band and ratio.
 * @param lastConfirmedAt - timestamp of last confirmation (or null)
 * @param now - injected current time
 * @param config - staleness config from rules.v1
 *
 * GOLD-06: 24.00h=FRESH, 24.01h=STALE, 72.00h=STALE, 72.01h=CRITICAL
 */
export function computeStaleness(
  lastConfirmedAt: Date | null,
  now: Date,
  config: RulesV1['staleness']
): StalenessResult {
  // null → CRITICAL + warning
  if (lastConfirmedAt === null) {
    return {
      hours: Infinity,
      band: StaleBand.CRITICAL,
      r_stale: 1,
      warning: 'No confirmation timestamp available; treated as CRITICAL',
    };
  }

  const diffMs = now.getTime() - lastConfirmedAt.getTime();

  // Future timestamp → invalid (BUS-014)
  if (diffMs < 0) {
    return {
      hours: 0,
      band: StaleBand.FRESH,
      r_stale: 0,
      warning: 'INVALID: confirmation timestamp is in the future',
    };
  }

  const hours = diffMs / (1000 * 60 * 60);

  let band: StaleBand;
  if (hours <= config.fresh_h) {
    band = StaleBand.FRESH;
  } else if (hours <= config.critical_after_h) {
    band = StaleBand.STALE;
  } else {
    band = StaleBand.CRITICAL;
  }

  const r_stale = Math.min(1, hours / config.critical_after_h);

  return { hours, band, r_stale };
}

/**
 * Validate staleness input (BUS-014).
 */
export function validateStalenessInput(
  lastConfirmedAt: Date | null,
  now: Date
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (lastConfirmedAt !== null && lastConfirmedAt.getTime() > now.getTime()) {
    issues.push({
      field: 'last_confirmed_at',
      reason: 'Timestamp is in the future',
      value: lastConfirmedAt.toISOString(),
    });
  }
  return issues;
}

// ── BUS-004 — Store Reliability Score ──

export interface SRSInput {
  r_stale: number;
  store_unavail_rate: number; // 0..1
  store_reject_rate: number;  // 0..1
  orders_in_window: number;
}

/**
 * Validate SRS input (BUS-014).
 */
export function validateSRSInput(input: SRSInput): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (input.store_unavail_rate < 0) {
    issues.push({ field: 'store_unavail_rate', reason: 'Negative rate', value: input.store_unavail_rate });
  }
  if (input.store_unavail_rate > 1) {
    issues.push({ field: 'store_unavail_rate', reason: 'Rate exceeds 100%', value: input.store_unavail_rate });
  }
  if (input.store_reject_rate < 0) {
    issues.push({ field: 'store_reject_rate', reason: 'Negative rate', value: input.store_reject_rate });
  }
  if (input.store_reject_rate > 1) {
    issues.push({ field: 'store_reject_rate', reason: 'Rate exceeds 100%', value: input.store_reject_rate });
  }
  if (input.orders_in_window < 0) {
    issues.push({ field: 'orders_in_window', reason: 'Negative count', value: input.orders_in_window });
  }
  return issues;
}

/**
 * Compute Store Reliability Score.
 *
 * Formula (ASM-005 defaults, configurable):
 *   r_unavail = min(1, store_unavail_rate / (cap_multiplier × baseline_unavail))
 *   r_reject  = min(1, store_reject_rate / (cap_multiplier × baseline_reject))
 *   risk = w_stale·r_stale + w_unavail·r_unavail + w_reject·r_reject
 *   SRS = round(100 × (1 − risk))
 *
 * Bands: HEALTHY ≥ 80, WATCH 60–79, AT_RISK < 60
 * Min sample: < min_orders → INSUFFICIENT_DATA
 *
 * GOLD-07: 36h, 3.85%/0% → SRS=60 WATCH; 0h,0/0 → 100; ≥72h, ≥2×baseline → 0 AT_RISK
 * GOLD-08: risk=0.20 → SRS=80 HEALTHY; 79 WATCH; 60 WATCH; 59 AT_RISK
 */
export function computeSRS(input: SRSInput, config: RulesV1['srs']): SRSResult {
  // Insufficient data
  if (input.orders_in_window < config.min_orders) {
    return {
      srs: 0,
      band: SRSBand.INSUFFICIENT_DATA,
      r_stale: input.r_stale,
      r_unavail: 0,
      r_reject: 0,
      risk: 0,
    };
  }

  const cap = config.rate_cap_multiplier;
  const unavailDenom = cap * config.baselines.unavail_cancel_rate;
  const rejectDenom = cap * config.baselines.reject_rate;

  const r_stale_clamped = Math.min(1, Math.max(0, input.r_stale));
  const r_unavail = unavailDenom > 0
    ? Math.min(1, Math.max(0, input.store_unavail_rate / unavailDenom))
    : 0;
  const r_reject = rejectDenom > 0
    ? Math.min(1, Math.max(0, input.store_reject_rate / rejectDenom))
    : 0;

  const { weights } = config;
  const rawRisk = weights.stale * r_stale_clamped + weights.unavail * r_unavail + weights.reject * r_reject;
  const risk = Math.min(1, Math.max(0, rawRisk));
  const srs = Math.min(100, Math.max(0, Math.round(100 * (1 - risk))));

  let band: SRSBand;
  if (srs >= config.bands.healthy_min) {
    band = SRSBand.HEALTHY;
  } else if (srs >= config.bands.watch_min) {
    band = SRSBand.WATCH;
  } else {
    band = SRSBand.AT_RISK;
  }

  return { srs, band, r_stale: r_stale_clamped, r_unavail, r_reject, risk };
}
