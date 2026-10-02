/**
 * BUS-009 — Impact Scenario
 * Pure function.
 */

import type { ScenarioResult, DataQualityIssue } from './types';
import { DataLabel } from './types';

export interface ScenarioInput {
  reduction: number; // 0..1
  inventory_cancels: number;
  aov: number; // ₹ per order
  revenue_per_order: number; // DER-011
  tickets_for_unavailable: number;
}

export function validateScenarioInput(input: ScenarioInput): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (input.reduction < 0 || input.reduction > 1) {
    issues.push({ field: 'reduction', reason: 'Must be between 0 and 1', value: input.reduction });
  }
  return issues;
}

/**
 * BUS-009: Calculate impact scenario.
 * GOLD-04: r=0.25 → 561 orders, ₹2.73L GMV, ₹0.38L revenue, 280 tickets
 */
export function computeScenario(input: ScenarioInput): ScenarioResult {
  const recovered_orders = Math.round(input.inventory_cancels * input.reduction);
  const gmv_recovered = recovered_orders * input.aov;
  const revenue_recovered = recovered_orders * input.revenue_per_order;
  const tickets_avoided = Math.round(input.tickets_for_unavailable * input.reduction);

  return {
    reduction: input.reduction,
    baseline_inventory_cancels: input.inventory_cancels,
    recovered_orders,
    gmv_recovered,
    revenue_recovered,
    tickets_avoided,
    unknowns: [
      { name: 'Customer Retention', description: 'Recovered orders may prevent churn', label: DataLabel.UNKNOWN },
      { name: 'Support Cost (₹)', description: 'Cost saved per ticket avoided', label: DataLabel.UNKNOWN },
      { name: 'Partner Churn', description: 'Reduced store effort may prevent partner churn', label: DataLabel.UNKNOWN },
    ],
    lim3_note: 'Direct revenue recovered is small; the true value lies in retention, support cost, and avoided spend.',
  };
}
