import { z } from 'zod';
import { Verdict, SpendGateDecision, DataLabel } from '../domain/types';

// Availability Contracts
export const GetAvailabilityRequestSchema = z.object({
  store_id: z.string().uuid().or(z.string()),
});

export const UpdateAvailabilityRequestSchema = z.object({
  store_id: z.string().uuid().or(z.string()),
  item_id: z.string().uuid().or(z.string()),
  is_available: z.boolean(),
});

export const NudgeResponseSchema = z.object({
  nudges: z.array(z.object({
    item_id: z.string(),
    item_name: z.string(),
    demand_score: z.number(),
    hours_since_confirmed: z.number(),
    priority: z.number(),
    reason: z.string(),
  })),
  srs: z.number(),
  band: z.string(),
});

// Domain schemas
export const MetricRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseline: z.number(),
  current: z.number(),
  delta: z.number(),
  direction: z.enum(['up', 'down', 'flat']),
  label: z.nativeEnum(DataLabel),
  type: z.enum(['growth', 'guardrail']),
  worse: z.boolean(),
  unit: z.string(),
});

export const EvidenceSchema = z.object({
  metric: z.string(),
  value: z.string(),
  period: z.string(),
  source_id: z.string(),
  label: z.nativeEnum(DataLabel),
  implication: z.string(),
});

// Growth Quality Contracts
export const GetVerdictRequestSchema = z.object({});

export const GetVerdictResponseSchema = z.object({
  verdict: z.nativeEnum(Verdict),
  growth_metrics: z.array(MetricRowSchema),
  guardrail_metrics: z.array(MetricRowSchema),
  worse_count: z.number(),
  evidence: z.array(EvidenceSchema),
});

export const SpendGateRequestSchema = z.object({
  proposed_increase: z.number().nonnegative(),
});

export const SpendGateResponseSchema = z.object({
  decision: z.nativeEnum(SpendGateDecision),
  what_happening: z.string(),
  why_matters: z.string(),
  what_changes: z.string(),
  cost: z.string(),
  what_improves: z.string(),
  what_could_go_wrong: z.string(),
  how_measured: z.string(),
});
