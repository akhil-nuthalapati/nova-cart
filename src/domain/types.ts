/**
 * Nova Cart — Domain Types
 * Pure types for business entities and rule I/O. No framework imports.
 */

// ── Enums ──

export const CancellationReason = {
  UNAVAILABLE: 'unavailable',
  CUSTOMER_DELAY: 'customer_delay',
  STORE_REJECTED: 'store_rejected',
  PARTNER_UNAVAILABLE: 'partner_unavailable',
  OTHER: 'other',
} as const;
export type CancellationReason = typeof CancellationReason[keyof typeof CancellationReason];

export const ALL_CANCELLATION_REASONS: CancellationReason[] = [
  CancellationReason.UNAVAILABLE,
  CancellationReason.CUSTOMER_DELAY,
  CancellationReason.STORE_REJECTED,
  CancellationReason.PARTNER_UNAVAILABLE,
  CancellationReason.OTHER,
];

export const INVENTORY_SIDE_REASONS: CancellationReason[] = [
  CancellationReason.UNAVAILABLE,
  CancellationReason.STORE_REJECTED,
];

export const DELIVERY_SIDE_REASONS: CancellationReason[] = [
  CancellationReason.CUSTOMER_DELAY,
  CancellationReason.PARTNER_UNAVAILABLE,
];

export const StaleBand = {
  FRESH: 'FRESH',
  STALE: 'STALE',
  CRITICAL: 'CRITICAL',
} as const;
export type StaleBand = typeof StaleBand[keyof typeof StaleBand];

export const SRSBand = {
  HEALTHY: 'HEALTHY',
  WATCH: 'WATCH',
  AT_RISK: 'AT_RISK',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
} as const;
export type SRSBand = typeof SRSBand[keyof typeof SRSBand];

export const Verdict = {
  GROWTH_WITH_QUALITY_DECLINE: 'GROWTH_WITH_QUALITY_DECLINE',
  HEALTHY_GROWTH: 'HEALTHY_GROWTH',
  MIXED: 'MIXED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type Verdict = typeof Verdict[keyof typeof Verdict];

export const ConfidenceLevel = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type ConfidenceLevel = typeof ConfidenceLevel[keyof typeof ConfidenceLevel];

export const DataLabel = {
  KNOWN: 'KNOWN',
  DERIVED: 'DERIVED',
  ASSUMED: 'ASSUMED',
  ESTIMATED: 'ESTIMATED',
  CORRELATED: 'CORRELATED',
  UNKNOWN: 'UNKNOWN',
} as const;
export type DataLabel = typeof DataLabel[keyof typeof DataLabel];

export const ItemConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type ItemConfidence = typeof ItemConfidence[keyof typeof ItemConfidence];

export const SpendGateDecision = {
  HOLD_INCREMENTAL_ACQUISITION: 'HOLD_INCREMENTAL_ACQUISITION',
  PROCEED: 'PROCEED',
} as const;
export type SpendGateDecision = typeof SpendGateDecision[keyof typeof SpendGateDecision];

// ── Metric Direction ──

export type MetricDirection = 'up' | 'down' | 'flat';

// ── BUS-002 ──

export interface CancellationBreakdown {
  total_orders: number;
  total_cancelled: number;
  cancellation_rate: number;
  by_reason: Record<CancellationReason, number>;
  shares: Record<CancellationReason, number>;
  inventory_side_count: number;
  inventory_side_share_of_orders: number;
  delivery_side_count: number;
  delivery_side_share_of_orders: number;
}

// ── BUS-003 ──

export interface StalenessResult {
  hours: number;
  band: StaleBand;
  r_stale: number;
  warning?: string;
}

// ── BUS-004 ──

export interface SRSResult {
  srs: number;
  band: SRSBand;
  r_stale: number;
  r_unavail: number;
  r_reject: number;
  risk: number;
}

// ── BUS-001 ──

export interface MetricRow {
  id: string;
  name: string;
  baseline: number;
  current: number;
  delta: number;
  direction: MetricDirection;
  label: DataLabel;
  type: 'growth' | 'guardrail';
  worse: boolean;
  unit: string;
}

export interface VerdictResult {
  verdict: Verdict;
  growth_metrics: MetricRow[];
  guardrail_metrics: MetricRow[];
  worse_count: number;
  evidence: Evidence[];
}

// ── BUS-007 ──

export interface NudgeItem {
  item_id: string;
  item_name: string;
  demand_score: number;
  staleness_ratio: number;
  priority: number;
  reason: string;
  hours_since_confirmed: number;
}

// ── BUS-009 ──

export interface ScenarioResult {
  reduction: number;
  baseline_inventory_cancels: number;
  recovered_orders: number;
  gmv_recovered: number;
  revenue_recovered: number;
  tickets_avoided: number;
  unknowns: ScenarioUnknown[];
  lim3_note: string;
}

export interface ScenarioUnknown {
  name: string;
  description: string;
  label: DataLabel;
}

// ── BUS-013 ──

export interface Evidence {
  metric: string;
  value: string;
  period: string;
  source_id: string;
  label: DataLabel;
  implication: string;
}

// ── BUS-014 ──

export interface DataQualityIssue {
  field: string;
  reason: string;
  value?: unknown;
}

// ── BUS-010 ──

export interface SpendGateResult {
  decision: SpendGateDecision;
  what_happening: string;
  why_matters: string;
  evidence: Evidence[];
  what_changes: string;
  cost: string;
  what_improves: string;
  what_could_go_wrong: string;
  how_measured: string;
}

// ── BUS-005 ──

export interface ItemConfidenceResult {
  item_id: string;
  confidence: ItemConfidence;
  staleness_band: StaleBand;
  recent_unavailable_cancels: number;
  reason: string;
}

// ── BUS-006 ──

export interface AlternativeSuggestion {
  type: 'same_item_other_store' | 'substitute';
  store_id?: string;
  store_name?: string;
  item_id: string;
  item_name: string;
  confidence: ItemConfidence;
  reason: string;
}

// ── BUS-008 ──

export interface InterventionEntry {
  store_id: string;
  store_name: string;
  srs: number;
  band: SRSBand;
  recommended_action: string;
  expected_avoided_orders: number;
  confidence: ConfidenceLevel;
  cost_estimate: string; // "₹X" or "DATA REQUIRED"
}

// ── BUS-011 ──

export interface RetentionCriticalFlag {
  order_id: string;
  customer_id: string;
  sequence_no: number;
  flagged: boolean;
  reason?: string;
}

// ── BUS-012 ──

export interface BudgetGuardResult {
  total_cost_known: number;
  total_cost_unresolved: number;
  has_unresolved: boolean;
  exceeds_cap: boolean;
  cap: number; // MET-023: ₹25L = 2500000
  warnings: string[];
}

// ── Metric Snapshot (MET-001..010) ──

export interface MetricSnapshot {
  met001_registered_users: number;
  met002_mau: number;
  met003_monthly_orders: number;
  met004_aov: number;  // ₹ per order
  met005_repeat_purchase_rate: number; // 0..1
  met006_avg_delivery_time: number; // minutes
  met007_cancellation_rate: number; // 0..1
  met008_support_tickets: number;
  met009_promo_spend: number; // ₹ (in raw, not lakh)
  met010_revenue: number; // ₹ (in raw, not lakh)
}

export const BASELINE_SNAPSHOT: MetricSnapshot = {
  met001_registered_users: 82000,
  met002_mau: 39000,
  met003_monthly_orders: 31200,
  met004_aov: 452,
  met005_repeat_purchase_rate: 0.41,
  met006_avg_delivery_time: 29,
  met007_cancellation_rate: 0.06,
  met008_support_tickets: 3100,
  met009_promo_spend: 950000, // ₹9.5L
  met010_revenue: 2180000,   // ₹21.8L
};

export const CURRENT_SNAPSHOT: MetricSnapshot = {
  met001_registered_users: 120000,
  met002_mau: 46000,
  met003_monthly_orders: 38500,
  met004_aov: 486,
  met005_repeat_purchase_rate: 0.27,
  met006_avg_delivery_time: 37,
  met007_cancellation_rate: 0.11,
  met008_support_tickets: 5900,
  met009_promo_spend: 1700000, // ₹17L
  met010_revenue: 2610000,    // ₹26.1L
};

// Cancellation reason shares from MET-015 (as %, must sum to ~100)
export const CANCELLATION_REASON_SHARES: Record<CancellationReason, number> = {
  unavailable: 35,
  customer_delay: 27,
  store_rejected: 18,
  partner_unavailable: 12,
  other: 8,
};

// Ticket category shares from MET-017 (as %, must sum to ~100)
export const TICKET_CATEGORY_SHARES = {
  refund_status: 29,
  delayed_delivery: 24,
  missing_unavailable: 19,
  coupon: 13,
  incorrect_order: 9,
  other: 6,
} as const;
