import { NextResponse } from 'next/server';
import { SpendGateRequestSchema } from '../../../api/contracts';
import { computeVerdict, computeSpendGate } from '../../../domain/verdict';
import { RULES_V1 } from '../../../config/rules.v1';
import { metricsRepo } from '../../../server/repositories';

export async function GET() {
  const { baseline, current } = await metricsRepo.getMetricSnapshots();
  if (!baseline || !current) {
    return NextResponse.json({ error: 'Snapshots missing' }, { status: 422 });
  }

  const verdictResult = computeVerdict(baseline, current, RULES_V1.verdict);

  return NextResponse.json(verdictResult);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proposed_increase } = SpendGateRequestSchema.parse(body);

    const { baseline, current } = await metricsRepo.getMetricSnapshots();
    if (!baseline || !current) {
      return NextResponse.json({ error: 'Snapshots missing' }, { status: 422 });
    }

    const verdictResult = computeVerdict(baseline, current, RULES_V1.verdict);
    
    // Revenue per promo (DER-003): Current Rev / Current Promo
    const rev_per_promo = current.met010_revenue / current.met009_promo_spend;

    const spendGate = computeSpendGate(
      verdictResult.verdict, 
      proposed_increase, 
      rev_per_promo
    );

    return NextResponse.json(spendGate);
  } catch (err: unknown) {
    const errorObj = err as { errors?: unknown };
    return NextResponse.json({ error: errorObj.errors || 'Invalid payload' }, { status: 400 });
  }
}
