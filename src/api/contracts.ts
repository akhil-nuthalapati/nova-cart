import { z } from 'zod';
import { Verdict, SpendGateDecision } from '../domain/types';

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

// Growth Quality Contracts
export const GetVerdictRequestSchema = z.object({});

export const GetVerdictResponseSchema = z.object({
  verdict: z.nativeEnum(Verdict),
  growth_metrics: z.array(z.any()), // Would map to MetricRow in production
  guardrail_metrics: z.array(z.any()),
  worse_count: z.number(),
  evidence: z.array(z.any()),
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
