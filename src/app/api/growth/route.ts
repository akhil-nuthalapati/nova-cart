import { NextResponse } from 'next/server';
import { SpendGateRequestSchema } from '../../../api/contracts';
import { computeVerdict, computeSpendGate } from '../../../domain/verdict';
import { RULES_V1 } from '../../../config/rules.v1';
import { metricsRepo } from '../../../server/repositories';

export async function GET() {
  const { baseline, current } = await metricsRepo.getMetricSnapshots();
  if (!baseline || !current) {
    return NextResponse.json(
      { error: { code: 'DATA_QUALITY_BLOCK', message: 'Snapshots missing' } },
      { status: 422 }
    );
  }

  const verdictResult = computeVerdict(baseline, current, RULES_V1.verdict);

  return NextResponse.json(verdictResult, {
    headers: {
      'Cache-Control': 'private, no-cache, no-transform',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SpendGateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid spend gate payload. proposed_increase must be a non-negative number.',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { proposed_increase } = parsed.data;

    const { baseline, current } = await metricsRepo.getMetricSnapshots();
    if (!baseline || !current) {
      return NextResponse.json(
        { error: { code: 'DATA_QUALITY_BLOCK', message: 'Snapshots missing from repository' } },
        { status: 422 }
      );
    }

    const verdictResult = computeVerdict(baseline, current, RULES_V1.verdict);

    // Revenue per promo (DER-003): Current Rev / Current Promo
    const rev_per_promo = current.met009_promo_spend > 0
      ? current.met010_revenue / current.met009_promo_spend
      : 0;

    const spendGate = computeSpendGate(
      verdictResult.verdict,
      proposed_increase,
      rev_per_promo
    );

    return NextResponse.json(spendGate);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message } },
      { status: 400 }
    );
  }
}
