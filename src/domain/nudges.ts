/**
 * BUS-007 — Store Nudge Prioritisation
 * Pure function. No I/O.
 */

import type { NudgeItem } from './types';
import type { RulesV1 } from '../config/rules.v1';

export interface NudgeInput {
  items: {
    item_id: string;
    item_name: string;
    demand_score: number; // e.g. times sold in window
    hours_since_confirmed: number;
  }[];
}

import type { DataQualityIssue } from './types';

export function validateNudgeInput(input: NudgeInput): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  for (const item of input.items) {
    if (item.demand_score < 0) {
      issues.push({ field: 'demand_score', reason: 'Negative demand score', value: item.demand_score });
    }
    if (item.hours_since_confirmed < 0) {
      issues.push({ field: 'hours_since_confirmed', reason: 'Negative confirmation age', value: item.hours_since_confirmed });
    }
  }
  return issues;
}

/**
 * BUS-007: Rank items for nudging.
 * Priority = demand_score × staleness_ratio
 * Excludes items confirmed within fresh_h.
 */
export function prioritizeNudges(
  input: NudgeInput,
  config: RulesV1['nudge'],
  stalenessConfig: RulesV1['staleness']
): NudgeItem[] {
  const nudges: NudgeItem[] = [];
  const criticalH = Math.max(1, stalenessConfig.critical_after_h);

  for (const item of input.items) {
    const hours = Math.max(0, item.hours_since_confirmed);
    if (hours <= stalenessConfig.fresh_h) {
      continue;
    }

    const staleness_ratio = Math.min(1, Math.max(0, hours / criticalH));
    const demand = Math.max(0, item.demand_score);
    const priority = demand * staleness_ratio;

    nudges.push({
      item_id: item.item_id,
      item_name: item.item_name,
      demand_score: demand,
      staleness_ratio,
      priority,
      reason: `Sold ${demand}× last ${config.demand_window_d}d, unconfirmed ${Math.floor(hours)}h`,
      hours_since_confirmed: hours,
    });
  }

  // Sort descending by priority, deterministic tie-break by item_id
  nudges.sort((a, b) => {
    if (Math.abs(b.priority - a.priority) > 0.0001) {
      return b.priority - a.priority;
    }
    return a.item_id.localeCompare(b.item_id);
  });

  return nudges.slice(0, Math.max(1, config.max_items));
}
