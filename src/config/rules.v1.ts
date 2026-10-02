/**
 * Nova Cart — Business Rule Configuration v1
 * All thresholds/weights are tunable defaults (ASM-005).
 * Change a value here = config change + test update, not code hunt.
 */

import { z } from 'zod';

export const RulesV1Schema = z.object({
  version: z.literal('v1'),

  // BUS-003 — Stock Staleness
  staleness: z.object({
    fresh_h: z.number().positive().default(24),
    critical_after_h: z.number().positive().default(72),
  }),

  // BUS-004 — Store Reliability Score
  srs: z.object({
    weights: z.object({
      stale: z.number().min(0).max(1).default(0.4),
      unavail: z.number().min(0).max(1).default(0.4),
      reject: z.number().min(0).max(1).default(0.2),
    }).refine(w => Math.abs(w.stale + w.unavail + w.reject - 1) < 0.001, {
      message: 'SRS weights must sum to 1',
    }),
    baselines: z.object({
      unavail_cancel_rate: z.number().default(0.0385), // DER-012: 3.85%
      reject_rate: z.number().default(0.0198),          // DER-012: 1.98%
    }),
    bands: z.object({
      healthy_min: z.number().default(80),
      watch_min: z.number().default(60),
    }),
    min_orders: z.number().int().nonnegative().default(20),
    rate_cap_multiplier: z.number().positive().default(2), // rates capped at N × baseline
  }),

  // BUS-007 — Store Nudge Prioritisation
  nudge: z.object({
    max_items: z.number().int().min(1).max(50).default(10),
    demand_window_d: z.number().int().positive().default(7),
  }),

  // BUS-009 — Impact Scenario
  scenario: z.object({
    presets: z.array(z.number().min(0).max(1)).default([0.10, 0.25, 0.50]),
  }),

  // BUS-005 — Item Availability Confidence
  itemConfidence: z.object({
    item_window_d: z.number().int().positive().default(30),
    item_cancel_low: z.number().int().nonnegative().default(3),
    hide_low_confidence: z.boolean().default(false),
  }),

  // BUS-001 — Quality-of-Growth Verdict
  verdict: z.object({
    tolerance: z.number().nonnegative().default(0),
    min_worse: z.number().int().positive().default(3),
  }),

  // BUS-014 — Data Quality Gate
  dataQuality: z.object({
    snapshot_max_age_d: z.number().int().positive().default(30),
    reason_share_tolerance_pp: z.number().default(1), // ±1 percentage point
  }),
});

export type RulesV1 = z.infer<typeof RulesV1Schema>;

export const RULES_V1: RulesV1 = RulesV1Schema.parse({
  version: 'v1',
  staleness: { fresh_h: 24, critical_after_h: 72 },
  srs: {
    weights: { stale: 0.4, unavail: 0.4, reject: 0.2 },
    baselines: { unavail_cancel_rate: 0.0385, reject_rate: 0.0198 },
    bands: { healthy_min: 80, watch_min: 60 },
    min_orders: 20,
    rate_cap_multiplier: 2,
  },
  nudge: { max_items: 10, demand_window_d: 7 },
  scenario: { presets: [0.10, 0.25, 0.50] },
  itemConfidence: { item_window_d: 30, item_cancel_low: 3, hide_low_confidence: false },
  verdict: { tolerance: 0, min_worse: 3 },
  dataQuality: { snapshot_max_age_d: 30, reason_share_tolerance_pp: 1 },
});
