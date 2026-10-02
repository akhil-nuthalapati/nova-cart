/**
 * BUS-001 — Quality-of-Growth Verdict
 * BUS-010 — Marketing Spend Gate
 * Pure functions.
 */

import type { MetricSnapshot, VerdictResult, MetricRow, SpendGateResult } from './types';
import { Verdict, DataLabel, SpendGateDecision } from './types';
import type { RulesV1 } from '../config/rules.v1';

function computeMetricRow(
  id: string, name: string, type: 'growth' | 'guardrail',
  baseline: number, current: number, unit: string,
  invertWorse: boolean, tolerance: number
): MetricRow {
  const delta = current - baseline;
  
  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';

  // For guardrails like cancellation rate, 'up' is worse (invertWorse = false)
  // For guardrails like repeat rate, 'down' is worse (invertWorse = true)
  let worse = false;
  if (type === 'guardrail') {
    if (invertWorse) {
      worse = delta < -tolerance;
    } else {
      worse = delta > tolerance;
    }
  }

  return {
    id, name, baseline, current, delta, direction,
    label: DataLabel.KNOWN, type, worse, unit
  };
}

/**
 * BUS-001: Quality-of-Growth Verdict
 */
export function computeVerdict(
  baseline: MetricSnapshot | null,
  current: MetricSnapshot,
  config: RulesV1['verdict']
): VerdictResult {
  if (!baseline) {
    return { verdict: Verdict.UNKNOWN, growth_metrics: [], guardrail_metrics: [], worse_count: 0, evidence: [] };
  }

  const { tolerance, min_worse } = config;

  const m1 = computeMetricRow('MET-001', 'Registered users', 'growth', baseline.met001_registered_users, current.met001_registered_users, 'users', false, tolerance);
  const m2 = computeMetricRow('MET-002', 'MAU', 'growth', baseline.met002_mau, current.met002_mau, 'users/mo', false, tolerance);
  const m3 = computeMetricRow('MET-003', 'Monthly orders', 'growth', baseline.met003_monthly_orders, current.met003_monthly_orders, 'orders/mo', false, tolerance);
  const m10 = computeMetricRow('MET-010', 'Revenue', 'growth', baseline.met010_revenue, current.met010_revenue, '₹/mo', false, tolerance);

  const growth_metrics = [m1, m2, m3, m10];

  const m5 = computeMetricRow('MET-005', 'Repeat purchase rate', 'guardrail', baseline.met005_repeat_purchase_rate, current.met005_repeat_purchase_rate, '%', true, tolerance);
  const m6 = computeMetricRow('MET-006', 'Avg delivery time', 'guardrail', baseline.met006_avg_delivery_time, current.met006_avg_delivery_time, 'min', false, tolerance);
  const m7 = computeMetricRow('MET-007', 'Order cancellation rate', 'guardrail', baseline.met007_cancellation_rate, current.met007_cancellation_rate, '%', false, tolerance);
  
  // DER-008: Tickets per order
  const b_tpo = baseline.met008_support_tickets / baseline.met003_monthly_orders;
  const c_tpo = current.met008_support_tickets / current.met003_monthly_orders;
  const m8d = computeMetricRow('DER-008', 'Tickets per order', 'guardrail', b_tpo, c_tpo, 'tickets/order', false, tolerance);
  m8d.label = DataLabel.DERIVED;

  // DER-001: Promo / Revenue
  const b_pr = baseline.met009_promo_spend / baseline.met010_revenue;
  const c_pr = current.met009_promo_spend / current.met010_revenue;
  const m9d = computeMetricRow('DER-001', 'Promo ÷ Revenue', 'guardrail', b_pr, c_pr, '%', false, tolerance);
  m9d.label = DataLabel.DERIVED;

  const guardrail_metrics = [m5, m6, m7, m8d, m9d];

  const anyGrowthImproved = growth_metrics.some(m => m.direction === 'up');
  const worseCount = guardrail_metrics.filter(m => m.worse).length;

  let verdict: Verdict = Verdict.MIXED;
  if (anyGrowthImproved && worseCount >= min_worse) {
    verdict = Verdict.GROWTH_WITH_QUALITY_DECLINE;
  } else if (worseCount <= 1) {
    verdict = Verdict.HEALTHY_GROWTH;
  }

  const evidence: import('./types').Evidence[] = [
    {
      metric: 'Cancellations 6%→11%',
      value: '53% inventory-side (35% unavailable + 18% rejected)',
      period: 'Last 6 months',
      source_id: 'S1 §2, §5',
      label: DataLabel.KNOWN,
      implication: 'Core operational leak: over half of cancellations stem from local store inventory inaccuracy.',
    },
    {
      metric: 'Promo vs Revenue',
      value: 'Promo +78.9% (₹17L/mo) vs Revenue +19.7% (₹26.1L/mo)',
      period: 'Last 6 months',
      source_id: 'S1 §2, §4',
      label: DataLabel.KNOWN,
      implication: 'Marginal promo efficiency is deteriorating (DER-003: ₹0.57 revenue per ₹1 promo).',
    },
    {
      metric: 'Repeat Purchase Rate',
      value: 'Fell from 41% to 27% (-14 pp)',
      period: 'Last 6 months',
      source_id: 'S1 §2',
      label: DataLabel.KNOWN,
      implication: 'Acquired customers are failing to retain; high discounts correlate with lower retention cohorts.',
    },
    {
      metric: 'Store Partner Survey',
      value: '39% say upkeep is too much effort; 18% considering leaving',
      period: 'Recent survey (n=100)',
      source_id: 'S1 §6',
      label: DataLabel.ESTIMATED,
      implication: 'Inventory updating burden causes store friction; solution must require minimal taps.',
    },
    {
      metric: 'Support Tickets',
      value: '5,900/mo (+90.3%); 19% missing/unavailable items',
      period: 'Current month',
      source_id: 'S1 §8',
      label: DataLabel.KNOWN,
      implication: 'Avoidable customer friction inflates support workload (9.2h average resolution).',
    },
    {
      metric: 'Churned Customer Feedback',
      value: '61% of churned users rated 4★+ before churning',
      period: 'Customer survey (n=2,000)',
      source_id: 'S1 §3',
      label: DataLabel.KNOWN,
      implication: 'Star ratings hide operational churn; availability failures drive quiet abandonment.',
    },
  ];

  return {
    verdict,
    growth_metrics,
    guardrail_metrics,
    worse_count: worseCount,
    evidence,
  };
}

/**
 * BUS-010: Marketing Spend Gate
 * Trigger: BUS-001 verdict = GROWTH_WITH_QUALITY_DECLINE AND proposed increase > 0.
 */
export function computeSpendGate(
  verdict: Verdict,
  proposedMarketingIncrease: number,
  der003_revenue_per_promo: number
): SpendGateResult | null {
  if (verdict !== Verdict.GROWTH_WITH_QUALITY_DECLINE || proposedMarketingIncrease <= 0) {
    return {
      decision: SpendGateDecision.PROCEED,
      what_happening: 'Growth quality is healthy or mixed.',
      why_matters: 'Marketing efficiency is maintained.',
      evidence: [],
      what_changes: 'Proceed with proposed spend.',
      cost: '₹' + proposedMarketingIncrease.toLocaleString(),
      what_improves: 'User growth continues.',
      what_could_go_wrong: 'CAC may rise slowly.',
      how_measured: 'Monitor CAC and retention.',
    };
  }

  const alternativeRevenue = Math.round(proposedMarketingIncrease * der003_revenue_per_promo);

  const spendEvidence: import('./types').Evidence[] = [
    {
      metric: 'Promo ÷ Revenue',
      value: '65.1% (up from 43.6%)',
      period: 'Current',
      source_id: 'DER-001',
      label: DataLabel.DERIVED,
      implication: 'Spend is accelerating faster than top-line recovery.',
    },
    {
      metric: 'Marginal Return',
      value: `₹${der003_revenue_per_promo.toFixed(2)} revenue per ₹1 promo`,
      period: '6-month delta',
      source_id: 'DER-003',
      label: DataLabel.DERIVED,
      implication: `Proposed ₹${(proposedMarketingIncrease / 100000).toFixed(1)}L spend would yield only ~₹${(alternativeRevenue / 100000).toFixed(1)}L top-line revenue at historic efficiency.`,
    },
    {
      metric: 'Customer Retention',
      value: 'Heavy discount cohorts correlate with lower repeat rates',
      period: 'Cohort analysis',
      source_id: 'MET-025',
      label: DataLabel.CORRELATED,
      implication: 'Pouring acquisition spend into broken availability exacerbates churn.',
    },
  ];

  return {
    decision: SpendGateDecision.HOLD_INCREMENTAL_ACQUISITION,
    what_happening: 'Growth is accelerating, but all 5 core quality guardrails are declining.',
    why_matters: 'Acquiring users into an inventory-leaky bucket is value destructive. High-discount cohorts correlate with lower repeat rates.',
    evidence: spendEvidence,
    what_changes: 'Hold the proposed incremental spend and redirect focus to operational availability fixes.',
    cost: '₹0 incremental spend',
    what_improves: 'Stabilizing availability stops cancellation churn, lifting organic retention and lowering effective CAC.',
    what_could_go_wrong: 'Top-line gross user registration growth volume may moderate temporarily.',
    how_measured: 'Inventory cancellation rate (KPI-01) and Repeat purchase rate (KPI-05).',
  };
}
