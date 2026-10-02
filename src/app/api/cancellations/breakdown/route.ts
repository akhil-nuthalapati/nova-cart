import { NextResponse } from 'next/server';
import { computeCancellationBreakdown, validateCancellationInput } from '../../../../domain/cancellation';
import { CANCELLATION_REASON_SHARES } from '../../../../domain/types';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * API-02: GET /api/cancellations/breakdown
 * Roles: pm, finance
 * Returns BUS-002 cancellation decomposition.
 */
export async function GET() {
  const db = getDB();
  const current = db.snapshots.current;
  
  const input = {
    total_orders: current.met003_monthly_orders,
    cancellation_rate: current.met007_cancellation_rate,
    reason_shares: CANCELLATION_REASON_SHARES,
  };

  const issues = validateCancellationInput(input);
  if (issues.length > 0) {
    return NextResponse.json({
      error: { code: 'DATA_QUALITY_BLOCK', message: 'Invalid cancellation data', details: issues }
    }, { status: 422 });
  }

  const result = computeCancellationBreakdown(input);

  return NextResponse.json({
    data: result,
    meta: {
      rule_id: 'BUS-002',
      rule_version: 'v1',
      confidence: 'HIGH',
      warnings: [],
      synthetic: true,
    }
  });
}
