import { NextResponse } from 'next/server';
import { generateInterventions } from '../../../domain/interventions';
import { computeBudgetGuard } from '../../../domain/budget';
import { computeSRS } from '../../../domain/reliability';
import { RULES_V1 } from '../../../config/rules.v1';
import { storesRepo, ordersRepo } from '../../../server/repositories';

/**
 * API-07: GET /api/interventions
 * Roles: pm (Partner Manager)
 * Purpose: BUS-008 Ops Intervention List & BUS-012 Budget Guard
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
  const reduction = parseFloat(searchParams.get('reduction') || '0.25');

  const stores = await storesRepo.getStores();
  const orderStats = await ordersRepo.getStoreOrderStats();
  const statsMap = new Map(orderStats.map((s) => [s.store_id, s]));

  const storeInputs = stores.map((s) => {
    const stats = statsMap.get(s.id) || {
      total_orders: 0,
      unavail_cancels: 0,
      reject_cancels: 0,
      inventory_cancels: 0,
      unavail_rate: 0,
      reject_rate: 0,
    };
    const hours = s.last_confirmed_hours_ago ?? 36;
    const r_stale = Math.min(1, hours / RULES_V1.staleness.critical_after_h);

    const srsResult = computeSRS(
      {
        r_stale,
        store_unavail_rate: stats.unavail_rate,
        store_reject_rate: stats.reject_rate,
        orders_in_window: stats.total_orders,
      },
      RULES_V1.srs
    );

    return {
      store_id: s.id,
      store_name: s.name,
      srs: srsResult.srs,
      band: srsResult.band,
      store_inventory_cancels_30d: stats.inventory_cancels,
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
