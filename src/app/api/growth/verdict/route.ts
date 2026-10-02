import { NextResponse } from 'next/server';
import { computeVerdict } from '../../../../domain/verdict';
import { RULES_V1 } from '../../../../config/rules.v1';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * API-01: GET /api/growth/verdict
 * Purpose: BUS-001, BUS-010
 * Roles: all (Executive / Finance / Ops)
 */
export async function GET() {
  const db = getDB();
  const baseline = db.snapshots?.baseline;
  const current = db.snapshots?.current;

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
