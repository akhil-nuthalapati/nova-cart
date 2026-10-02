/**
 * BUS-008 — Ops Intervention List
 * Pure function. No I/O.
 *
 * Ranks stores by expected_avoidable_cancels = store_inventory_cancels_30d * reduction_assumption.
 * Generates recommended actions and flags budget / confidence metadata.
 */

import type { InterventionEntry, SRSBand } from './types';
import { ConfidenceLevel } from './types';

export interface StoreInterventionInput {
  store_id: string;
  store_name: string;
  srs: number;
  band: SRSBand;
  store_inventory_cancels_30d: number;
  last_confirmed_hours_ago: number;
}

/**
 * BUS-008: Rank stores and suggest operational interventions.
 */
export function generateInterventions(
  stores: StoreInterventionInput[],
  reductionAssumption: number = 0.25,
  limit: number = 10
): InterventionEntry[] {
  const entries: InterventionEntry[] = stores.map((s) => {
    const expected_avoided_orders = Math.round(
      s.store_inventory_cancels_30d * reductionAssumption
    );

    let recommended_action: string;
    let cost_estimate: string;

    if (s.srs < 40) {
      recommended_action = 'Urgent: Partner Ops call + temporarily pause high-out-of-stock SKUs';
      cost_estimate = 'DATA REQUIRED';
    } else if (s.srs < 60) {
      recommended_action = 'Increase daily automated nudge cadence & conduct inventory spot-check';
      cost_estimate = '₹0 incremental';
    } else if (s.srs < 80) {
      recommended_action = 'Standard daily stock confirmation nudge';
      cost_estimate = '₹0 incremental';
    } else {
      recommended_action = 'Maintain current cadence (Healthy)';
      cost_estimate = '₹0 incremental';
    }

    return {
      store_id: s.store_id,
      store_name: s.store_name,
      srs: s.srs,
      band: s.band,
      recommended_action,
      expected_avoided_orders,
      confidence: ConfidenceLevel.MEDIUM,
      cost_estimate,
    };
  });

  // Rank descending by expected avoided cancellations, then by lower SRS, then by store_id
  entries.sort((a, b) => {
    if (b.expected_avoided_orders !== a.expected_avoided_orders) {
      return b.expected_avoided_orders - a.expected_avoided_orders;
    }
    if (a.srs !== b.srs) {
      return a.srs - b.srs;
    }
    return a.store_id.localeCompare(b.store_id);
  });

  return entries.slice(0, Math.max(1, limit));
}
