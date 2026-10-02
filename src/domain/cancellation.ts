/**
 * BUS-002 — Cancellation Decomposition
 * Pure function. No I/O.
 *
 * Inputs: total orders, cancellation rate, reason breakdown (shares as %).
 * Output: CancellationBreakdown with counts, shares, inventory/delivery side.
 */

import type { CancellationBreakdown, CancellationReason } from './types';
import {
  ALL_CANCELLATION_REASONS,
  INVENTORY_SIDE_REASONS,
  DELIVERY_SIDE_REASONS,
} from './types';
import type { DataQualityIssue } from './types';

export interface CancellationInput {
  total_orders: number;
  cancellation_rate: number; // 0..1
  reason_shares: Record<CancellationReason, number>; // % (should sum ≈ 100)
}

/**
 * Validate cancellation inputs (BUS-014).
 * Returns issues or empty array.
 */
export function validateCancellationInput(
  input: CancellationInput,
  tolerancePp: number = 1
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  if (input.total_orders < 0) {
    issues.push({ field: 'total_orders', reason: 'Negative order count', value: input.total_orders });
  }
  if (input.cancellation_rate < 0 || input.cancellation_rate > 1) {
    issues.push({ field: 'cancellation_rate', reason: 'Rate must be between 0 and 1', value: input.cancellation_rate });
  }

  const shareSum = Object.values(input.reason_shares).reduce((a, b) => a + b, 0);
  if (Math.abs(shareSum - 100) > tolerancePp) {
    issues.push({
      field: 'reason_shares',
      reason: `Reason shares sum to ${shareSum}%, expected 100% (±${tolerancePp}pp)`,
      value: shareSum,
    });
  }

  return issues;
}

/**
 * BUS-002: decompose cancellations by reason.
 * Golden values (GOLD-01): 38500 orders, 11% cancel → 4235 cancelled.
 *   unavailable=1482, customer_delay=1143, store_rejected=762, partner_unavailable=508, other=339
 *   inventory_side=2245 (≈5.8% of orders)
 */
export function computeCancellationBreakdown(input: CancellationInput): CancellationBreakdown {
  const total_cancelled = Math.round(input.total_orders * input.cancellation_rate);

  const by_reason = {} as Record<CancellationReason, number>;
  const shares = {} as Record<CancellationReason, number>;

  for (const reason of ALL_CANCELLATION_REASONS) {
    const share = input.reason_shares[reason] / 100;
    by_reason[reason] = Math.round(total_cancelled * share);
    shares[reason] = input.reason_shares[reason];
  }

  const inventory_side_count = INVENTORY_SIDE_REASONS.reduce(
    (sum, r) => sum + by_reason[r], 0
  );
  const delivery_side_count = DELIVERY_SIDE_REASONS.reduce(
    (sum, r) => sum + by_reason[r], 0
  );

  return {
    total_orders: input.total_orders,
    total_cancelled,
    cancellation_rate: input.cancellation_rate,
    by_reason,
    shares,
    inventory_side_count,
    inventory_side_share_of_orders: input.total_orders > 0
      ? inventory_side_count / input.total_orders
      : 0,
    delivery_side_count,
    delivery_side_share_of_orders: input.total_orders > 0
      ? delivery_side_count / input.total_orders
      : 0,
  };
}
