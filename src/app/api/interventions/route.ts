import { NextResponse } from 'next/server';
import { generateInterventions } from '../../../domain/interventions';
import { computeBudgetGuard } from '../../../domain/budget';
import { computeSRS } from '../../../domain/reliability';
import { RULES_V1 } from '../../../config/rules.v1';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * API-07: GET /api/interventions
 * Roles: pm (Partner Manager)
 * Purpose: BUS-008 Ops Intervention List & BUS-012 Budget Guard
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
  const reduction = parseFloat(searchParams.get('reduction') || '0.25');

  const db = getDB();
  const stores = db.stores || [];
  const orders = db.orders || [];

  // Group orders by store to compute rates
  const storeOrderStats: Record<string, { total: number; unavail: number; reject: number }> = {};
  for (const o of orders) {
    if (!storeOrderStats[o.store_id]) {
      storeOrderStats[o.store_id] = { total: 0, unavail: 0, reject: 0 };
    }
    storeOrderStats[o.store_id].total++;
    if (o.cancellation_reason === 'unavailable') storeOrderStats[o.store_id].unavail++;
    if (o.cancellation_reason === 'store_rejected') storeOrderStats[o.store_id].reject++;
  }

  const storeInputs = stores.map((s: any) => {
    const stats = storeOrderStats[s.id] || { total: 0, unavail: 0, reject: 0 };
    const hours = s.last_confirmed_hours_ago ?? 36;
    const r_stale = Math.min(1, hours / RULES_V1.staleness.critical_after_h);
    const unavail_rate = stats.total > 0 ? stats.unavail / stats.total : 0;
    const reject_rate = stats.total > 0 ? stats.reject / stats.total : 0;

    const srsResult = computeSRS(
      {
        r_stale,
        store_unavail_rate: unavail_rate,
        store_reject_rate: reject_rate,
        orders_in_window: stats.total,
      },
      RULES_V1.srs
    );

    return {
      store_id: s.id,
      store_name: s.name,
      srs: srsResult.srs,
      band: srsResult.band,
      store_inventory_cancels_30d: stats.unavail + stats.reject,
      last_confirmed_hours_ago: hours,
    };
  });

  const interventions = generateInterventions(storeInputs, reduction, limit);
  const budgetGuard = computeBudgetGuard(interventions);

  return NextResponse.json({
    data: {
      interventions,
      budget_guard: budgetGuard,
      total_stores_evaluated: stores.length,
      reduction_assumption: reduction,
    },
    meta: {
      rule_id: 'BUS-008,BUS-012',
      rule_version: 'v1',
      confidence: 'MEDIUM',
      warnings: budgetGuard.warnings,
      synthetic: true,
    },
  });
}
