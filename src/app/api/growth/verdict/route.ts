import { NextResponse } from 'next/server';
import { computeVerdict } from '../../../../domain/verdict';
import { RULES_V1 } from '../../../../config/rules.v1';
import { metricsRepo } from '../../../../server/repositories';

/**
 * API-01: GET /api/growth/verdict
 * Purpose: BUS-001, BUS-010
 * Roles: all (Executive / Finance / Ops)
 */
export async function GET() {
  const { baseline, current } = await metricsRepo.getMetricSnapshots();

  if (!baseline || !current) {
    return NextResponse.json(
      {
        error: {
          code: 'DATA_QUALITY_BLOCK',
          message: 'Missing baseline or current snapshot in database.',
        },
      },
      { status: 422 }
    );
  }

  const verdictResult = computeVerdict(baseline, current, RULES_V1.verdict);

  return NextResponse.json({
    data: verdictResult,
    meta: {
      rule_id: 'BUS-001',
      rule_version: 'v1',
      confidence: 'HIGH',
      warnings: [],
      synthetic: true,
    },
  });
}
