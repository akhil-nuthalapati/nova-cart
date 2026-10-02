/**
 * Orders Repository — Order statistics and cancellation aggregations.
 * ARCH-004: queries only, no business logic.
 * Supports dual-mode (Supabase vs demo JSON).
 */

import { getServerSupabase, isDemoStatic } from '../../lib/supabase';
import { getDemoDB } from '../db/json-store';
import type { CancellationBreakdownView } from '../db/types';

export interface StoreOrderStats {
  store_id: string;
  total_orders: number;
  total_cancelled: number;
  unavail_cancels: number;
  reject_cancels: number;
  inventory_cancels: number;
  unavail_rate: number;
  reject_rate: number;
}

/**
 * Fetch platform-wide cancellation breakdown from the v_cancellation_breakdown view.
 */
export async function getCancellationBreakdown(cityFilter?: string): Promise<CancellationBreakdownView> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    let orders = db.orders;

    if (cityFilter) {
      const cityStoreIds = new Set(
        db.stores
          .filter((s) => s.city.toLowerCase() === cityFilter.toLowerCase())
          .map((s) => s.id)
      );
      orders = orders.filter((o) => cityStoreIds.has(o.store_id));
    }

    const total_orders = orders.length;
    let total_cancelled = 0;
    let unavailable = 0;
    let customer_delay = 0;
    let store_rejected = 0;
    let partner_unavailable = 0;
    let other_reason = 0;

    for (const o of orders) {
      if (o.status === 'cancelled') {
        total_cancelled++;
        switch (o.cancellation_reason) {
          case 'unavailable':
            unavailable++;
            break;
          case 'customer_delay':
            customer_delay++;
            break;
          case 'store_rejected':
            store_rejected++;
            break;
          case 'partner_unavailable':
            partner_unavailable++;
            break;
          default:
            other_reason++;
            break;
        }
      }
    }

    return {
      total_orders,
      total_cancelled,
      unavailable,
      customer_delay,
      store_rejected,
      partner_unavailable,
      other_reason,
    };
  }

  const supabase = getServerSupabase();

  if (cityFilter) {
    const { data, error } = await supabase.rpc('get_cancellation_breakdown_by_city', {
      city_name: cityFilter,
    });

    if (error) {
      throw new Error(`[orders.repo] Breakdown by city failed: ${error.message}`);
    }
    return data as CancellationBreakdownView;
  }

  const { data, error } = await supabase
    .from('v_cancellation_breakdown')
    .select('*')
    .single();

  if (error) {
    throw new Error(`[orders.repo] Cancellation breakdown failed: ${error.message}`);
  }

  return data as CancellationBreakdownView;
}

/**
 * Fetch per-store order stats from the v_store_order_stats view or demo store orders.
 */
export async function getStoreOrderStats(storeIds?: string[]): Promise<StoreOrderStats[]> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    const idSet = storeIds && storeIds.length > 0 ? new Set(storeIds) : null;

    const statsMap = new Map<string, { total: number; unavail: number; reject: number }>();

    for (const o of db.orders) {
      if (idSet && !idSet.has(o.store_id)) continue;

      let entry = statsMap.get(o.store_id);
      if (!entry) {
        entry = { total: 0, unavail: 0, reject: 0 };
        statsMap.set(o.store_id, entry);
      }

      entry.total++;
      if (o.cancellation_reason === 'unavailable') entry.unavail++;
      if (o.cancellation_reason === 'store_rejected') entry.reject++;
    }

    const results: StoreOrderStats[] = [];
    for (const [store_id, s] of statsMap.entries()) {
      results.push({
        store_id,
        total_orders: s.total,
        total_cancelled: s.unavail + s.reject,
        unavail_cancels: s.unavail,
        reject_cancels: s.reject,
        inventory_cancels: s.unavail + s.reject,
        unavail_rate: s.total > 0 ? s.unavail / s.total : 0,
        reject_rate: s.total > 0 ? s.reject / s.total : 0,
      });
    }

    return results;
  }

  const supabase = getServerSupabase();

  let query = supabase.from('v_store_order_stats').select('*');

  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[orders.repo] Store order stats failed: ${error.message}`);
  }

  return (data || []) as StoreOrderStats[];
}

/**
 * Count total inventory-side cancellations platform-wide.
 */
export async function getInventoryCancellationCount(): Promise<number> {
  if (isDemoStatic()) {
    const breakdown = await getCancellationBreakdown();
    return breakdown.unavailable + breakdown.store_rejected;
  }

  const supabase = getServerSupabase();

  const { count, error } = await supabase
    .from('cancellations')
    .select('*', { count: 'exact', head: true })
    .in('reason', ['unavailable', 'store_rejected']);

  if (error) {
    throw new Error(`[orders.repo] Inventory cancel count failed: ${error.message}`);
  }

  return count ?? 0;
}
