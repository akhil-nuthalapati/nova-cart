import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeScenario, validateScenarioInput } from '../../../../domain/scenario';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

const ScenarioRequestSchema = z.object({
  reduction: z.number().min(0).max(1),
});

/**
 * API-06: POST /api/scenarios/impact
 * Roles: pm, finance
 * Purpose: BUS-009 Impact Scenario Simulation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ScenarioRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Reduction must be a number between 0 and 1 (inclusive).',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { reduction } = parsed.data;

    const db = getDB();
    const current = db.snapshots?.current;
    const aov = current?.met004_aov ?? 486;
    const revPerOrder = (current?.met010_revenue && current?.met003_monthly_orders)
      ? current.met010_revenue / current.met003_monthly_orders
      : 67.79;

    const input = {
      reduction,
      inventory_cancels: 2245, // DER-006: 1482 unavailable + 762 rejected
      aov,
      revenue_per_order: Number(revPerOrder.toFixed(2)),
      tickets_for_unavailable: db.tickets?.missing_unavailable ?? 1121,
    };

    const issues = validateScenarioInput(input);
    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'DATA_QUALITY_BLOCK',
            message: 'Invalid scenario inputs',
            details: issues,
          },
        },
        { status: 422 }
      );
    }

    const scenarioResult = computeScenario(input);

    return NextResponse.json({
      data: scenarioResult,
      meta: {
        rule_id: 'BUS-009',
        rule_version: 'v1',
        confidence: 'MEDIUM',
        warnings: [
          'Scenario output is a simulation based on ASM-008, not an operational forecast.',
          'Direct revenue recovered is small; true business impact lies in retention and avoided support costs (LIM-3).',
        ],
        synthetic: true,
      },
    });
  } catch (err: any) {
    console.error('Scenario API Error:', err);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL',
          message: err?.message || 'Failed to process scenario calculation',
        },
      },
      { status: 500 }
    );
  }
}
