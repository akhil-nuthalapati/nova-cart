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

  for (const item of input.items) {
    if (item.hours_since_confirmed <= stalenessConfig.fresh_h) {
      continue;
    }

    const staleness_ratio = Math.min(1, item.hours_since_confirmed / stalenessConfig.critical_after_h);
    const priority = item.demand_score * staleness_ratio;

    nudges.push({
      item_id: item.item_id,
      item_name: item.item_name,
      demand_score: item.demand_score,
      staleness_ratio,
      priority,
      reason: `Sold ${item.demand_score}× last ${config.demand_window_d}d, unconfirmed ${Math.floor(item.hours_since_confirmed)}h`,
      hours_since_confirmed: item.hours_since_confirmed,
    });
  }

  // Sort descending by priority, deterministic tie-break by item_id
  nudges.sort((a, b) => {
    if (Math.abs(b.priority - a.priority) > 0.0001) {
      return b.priority - a.priority;
    }
    return a.item_id.localeCompare(b.item_id);
  });

  return nudges.slice(0, config.max_items);
}
