/**
 * BUS-012 — Budget Guard
 * Pure function. No I/O.
 *
 * Every recommendation carries cost_estimate (₹ or "DATA REQUIRED").
 * Unknown cost → "UNRESOLVED", never 0.
 * Sum of accepted interventions vs MET-023 (₹25L = 2500000).
 * Surface DER-009/ASM-002 conflict as a visible warning.
 */

import type { BudgetGuardResult, InterventionEntry } from './types';

const BUDGET_CAP = 2500000; // ₹25L

export function computeBudgetGuard(interventions: InterventionEntry[]): BudgetGuardResult {
  let total_cost_known = 0;
  let total_cost_unresolved = 0;
  let has_unresolved = false;
  const warnings: string[] = [];

  for (const item of interventions) {
    if (item.cost_estimate === 'DATA REQUIRED' || item.cost_estimate === 'UNRESOLVED') {
      has_unresolved = true;
      total_cost_unresolved++;
    } else {
      const parsed = parseFloat(item.cost_estimate.replace(/[₹,]/g, ''));
      if (!isNaN(parsed)) {
        total_cost_known += parsed;
      } else {
        has_unresolved = true;
        total_cost_unresolved++;
      }
    }
  }

  const exceeds_cap = total_cost_known > BUDGET_CAP;

  if (exceeds_cap) {
    warnings.push(`Total known cost ₹${(total_cost_known / 100000).toFixed(1)}L exceeds ₹25L implementation cap (MET-023).`);
  }

  if (has_unresolved) {
    warnings.push(`${total_cost_unresolved} intervention(s) have unresolved costs. True total may differ.`);
  }

  // DER-009/ASM-002 conflict warning
  warnings.push('DER-009: Proposed +30% marketing = +₹5.1L/month (₹30.6L over 6 months) may conflict with ₹25L cap if counted against implementation budget (ASM-002).');

  return {
    total_cost_known,
    total_cost_unresolved,
    has_unresolved,
    exceeds_cap,
    cap: BUDGET_CAP,
    warnings,
  };
}
