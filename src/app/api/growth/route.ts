import { NextResponse } from 'next/server';
import { SpendGateRequestSchema } from '../../../api/contracts';
import { computeVerdict, computeSpendGate } from '../../../domain/verdict';
import { RULES_V1 } from '../../../config/rules.v1';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export async function GET() {
  const db = getDB();
  const baseline = db.snapshots.baseline;
  const current = db.snapshots.current;

  const verdictResult = computeVerdict(baseline, current, RULES_V1.verdict);

  return NextResponse.json(verdictResult);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proposed_increase } = SpendGateRequestSchema.parse(body);

    const db = getDB();
    const baseline = db.snapshots.baseline;
    const current = db.snapshots.current;

    const verdictResult = computeVerdict(baseline, current, RULES_V1.verdict);
    
    // Revenue per promo (DER-003): Current Rev / Current Promo
    const rev_per_promo = current.met010_revenue / current.met009_promo_spend;

    const spendGate = computeSpendGate(
      verdictResult.verdict, 
      proposed_increase, 
      rev_per_promo
    );

    return NextResponse.json(spendGate);
  } catch (err: any) {
    return NextResponse.json({ error: err.errors || 'Invalid payload' }, { status: 400 });
  }
}
