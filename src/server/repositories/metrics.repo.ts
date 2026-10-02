/**
 * Metrics Repository — Retrieves metric snapshots (baseline/current)
 * ARCH-004: queries only, no business logic.
 * Supports dual-mode (Supabase vs demo JSON).
 */

import { getServerSupabase, isDemoStatic } from '../../lib/supabase';
import { getDemoDB } from '../db/json-store';
import { RULES_V1 } from '../../config/rules.v1';
import type { MetricSnapshotRow } from '../db/types';
import type { MetricSnapshot } from '../../domain/types';
import { getTicketBreakdown } from './tickets.repo';

export { getTicketBreakdown };

export interface MetricSnapshots {
  baseline: MetricSnapshot | null;
  current: MetricSnapshot | null;
}

/**
 * Fetch baseline and current metric snapshots.
 */
export async function getMetricSnapshots(): Promise<MetricSnapshots> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    return {
      baseline: (db.snapshots?.baseline as unknown as MetricSnapshot) ?? null,
      current: (db.snapshots?.current as unknown as MetricSnapshot) ?? null,
    };
  }

  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('metric_snapshots')
    .select('period, payload')
    .in('period', ['baseline', 'current']);

  if (error) {
    throw new Error(`[metrics.repo] Failed to fetch snapshots: ${error.message}`);
  }

  const rows = (data || []) as Pick<MetricSnapshotRow, 'period' | 'payload'>[];

  const baseline = (rows.find(r => r.period === 'baseline')?.payload as unknown as MetricSnapshot) ?? null;
  const current = (rows.find(r => r.period === 'current')?.payload as unknown as MetricSnapshot) ?? null;

  return { baseline, current };
}

/**
 * Fetch active rule configuration.
 */
export async function getActiveRuleConfig(): Promise<Record<string, unknown> | null> {
  if (isDemoStatic()) {
    return RULES_V1 as unknown as Record<string, unknown>;
  }

  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('rule_config')
    .select('payload')
    .eq('active', true)
    .limit(1)
    .single();

  if (error) {
    console.warn(`[metrics.repo] No active rule config found: ${error.message}`);
    return RULES_V1 as unknown as Record<string, unknown>;
  }

  return (data?.payload as Record<string, unknown>) ?? (RULES_V1 as unknown as Record<string, unknown>);
}
