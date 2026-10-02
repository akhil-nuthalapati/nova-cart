/**
 * Inventory Repository — Store items, stock confirmations, nudge data.
 * ARCH-004: queries only, no business logic.
 * Supports dual-mode (Supabase vs demo JSON).
 */

import { getServerSupabase, isDemoStatic } from '../../lib/supabase';
import {
  getDemoDB,
  getDemoInventory,
  getDemoBatch,
  saveDemoBatch,
  type ConfirmationBatchResult,
  type ConfirmationScoreContext,
} from '../db/json-store';
import type { StockConfirmationRow } from '../db/types';

export interface StoreItemWithCatalog {
  store_id: string;
  item_id: string;
  item_name: string;
  category: string;
  in_stock: boolean;
  last_confirmed_at: string | null;
  demand_score?: number;
  hours_since_confirmed?: number;
}

const DEMO_CATALOG = [
  { item_id: 'item-1', name: 'Farm Fresh Whole Milk 1L', category: 'dairy', demand: 28 },
  { item_id: 'item-2', name: 'Brown Eggs (Pack of 12)', category: 'dairy', demand: 22 },
  { item_id: 'item-3', name: 'Whole Wheat Bread 400g', category: 'bakery', demand: 18 },
  { item_id: 'item-4', name: 'Organic Bananas 1kg', category: 'fruits', demand: 16 },
  { item_id: 'item-5', name: 'Greek Yogurt 400g', category: 'dairy', demand: 14 },
  { item_id: 'item-6', name: 'Salted Butter 500g', category: 'dairy', demand: 11 },
  { item_id: 'item-7', name: 'Cheddar Cheese Block 200g', category: 'dairy', demand: 9 },
  { item_id: 'item-8', name: 'Rolled Oats 1kg', category: 'cereals', demand: 7 },
  { item_id: 'item-9', name: 'Organic Soy Milk 1L', category: 'dairy', demand: 6 },
  { item_id: 'item-10', name: 'Paracetamol 500mg', category: 'pharmacy', demand: 5 },
];

/**
 * Fetch inventory items for a store with catalog details.
 */
export async function getStoreItems(storeId: string): Promise<StoreItemWithCatalog[]> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    const store = db.stores.find((s) => s.id === storeId);
    const hours = store?.last_confirmed_hours_ago ?? 36;

    const now = Date.now();
    const state = getDemoInventory(storeId, () => new Map(DEMO_CATALOG.map((cat, idx) => [
      `${storeId}-${cat.item_id}`,
      {
        in_stock: true,
        last_confirmed_at: new Date(now - (hours + idx * 2) * 3600000).toISOString(),
      },
    ])));
    return DEMO_CATALOG.map((cat) => {
      const itemId = `${storeId}-${cat.item_id}`;
      const item = state.get(itemId)!;
      return {
        store_id: storeId,
        item_id: itemId,
        item_name: cat.name,
        category: cat.category,
        ...item,
        demand_score: cat.demand,
        hours_since_confirmed: Math.max(0, (now - Date.parse(item.last_confirmed_at)) / 3600000),
      };
    });
  }

  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('store_items')
    .select('store_id, item_id, in_stock, last_confirmed_at, catalog_items!inner(name, category)')
    .eq('store_id', storeId);

  if (error) {
    throw new Error(`[inventory.repo] Failed to fetch store items: ${error.message}`);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    store_id: row.store_id as string,
    item_id: row.item_id as string,
    item_name: ((row.catalog_items as Record<string, string>)?.name) ?? 'Unknown Item',
    category: ((row.catalog_items as Record<string, string>)?.category) ?? 'other',
    in_stock: row.in_stock as boolean,
    last_confirmed_at: row.last_confirmed_at as string | null,
  }));
}

/**
 * Fetch store freshness data from the v_store_freshness view.
 */
export async function getStoreFreshness(storeIds?: string[]): Promise<Array<{
  store_id: string;
  avg_hours_since_confirmed: number;
  total_items: number;
  in_stock_count: number;
}>> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    let stores = db.stores;
    if (storeIds && storeIds.length > 0) {
      const set = new Set(storeIds);
      stores = stores.filter((s) => set.has(s.id));
    }

    return Promise.all(stores.map(async (store) => {
      const items = await getStoreItems(store.id);
      return {
        store_id: store.id,
        avg_hours_since_confirmed: items.reduce((sum, item) => sum + item.hours_since_confirmed!, 0) / items.length,
        total_items: items.length,
        in_stock_count: items.filter((item) => item.in_stock).length,
      };
    }));
  }

  const supabase = getServerSupabase();

  let query = supabase
    .from('v_store_freshness')
    .select('store_id, avg_hours_since_confirmed, total_items, in_stock_count');

  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[inventory.repo] Store freshness failed: ${error.message}`);
  }

  return (data || []) as Array<{
    store_id: string;
    avg_hours_since_confirmed: number;
    total_items: number;
    in_stock_count: number;
  }>;
}

export interface ConfirmationItem {
  itemId: string;
  inStock: boolean;
}

/** Apply the entire batch atomically; identical retries replay the original result. */
export async function confirmStockBatch(
  storeId: string,
  items: ConfirmationItem[],
  idempotencyKey: string,
  confirmedBy?: string,
  scoreContext?: ConfirmationScoreContext,
): Promise<ConfirmationBatchResult> {
  const sorted = [...items].sort((a, b) => a.itemId.localeCompare(b.itemId));
  if (!idempotencyKey || sorted.length === 0 || new Set(sorted.map((item) => item.itemId)).size !== sorted.length) {
    throw new Error('INVALID_CONFIRMATION_BATCH');
  }
  if (!isDemoStatic()) {
    const { data, error } = await getServerSupabase().rpc('confirm_stock_batch', {
      p_store_id: storeId,
      p_items: sorted,
      p_idempotency_key: idempotencyKey,
      p_confirmed_by: confirmedBy ?? null,
      p_score_context: scoreContext ?? null,
    });
    if (error) throw new Error(`[inventory.repo] ${error.message}`);
    if (!data) throw new Error('[inventory.repo] Confirmation returned no result');
    return data as ConfirmationBatchResult;
  }

  const payload = JSON.stringify({ items: sorted, confirmedBy: confirmedBy ?? null });
  // Initialize inventory before entering the synchronous validate-and-commit section.
  const inventory = await getStoreItems(storeId);
  const previous = getDemoBatch(storeId, idempotencyKey);
  if (previous) {
    if (previous.payload !== payload) throw new Error('IDEMPOTENCY_CONFLICT');
    return structuredClone(previous.result);
  }
  if (!getDemoDB().stores.some((store) => store.id === storeId) ||
      sorted.some((item) => !inventory.some((existing) => existing.item_id === item.itemId))) {
    throw new Error('INVALID_CONFIRMATION_ITEM');
  }
  const state = getDemoInventory(storeId, () => new Map());
  const confirmedAt = new Date().toISOString();
  const hours = () => Array.from(state.values()).reduce((sum, item) =>
    sum + Math.max(0, (Date.parse(confirmedAt) - Date.parse(item.last_confirmed_at)) / 3600000), 0) / state.size;
  const beforeHours = hours();
  const confirmations = sorted.map((item) => ({
    id: crypto.randomUUID(),
    store_id: storeId,
    item_id: item.itemId,
    in_stock: item.inStock,
    idempotency_key: JSON.stringify([storeId, idempotencyKey, item.itemId]),
    confirmed_by: confirmedBy ?? null,
    created_at: confirmedAt,
  }));
  for (const item of sorted) {
    state.set(item.itemId, { in_stock: item.inStock, last_confirmed_at: confirmedAt });
  }
  const result = { confirmations, before_hours: beforeHours, after_hours: hours(), score_context: scoreContext ?? null };
  saveDemoBatch(storeId, idempotencyKey, payload, result);
  return structuredClone(result);
}

/** Single-item callers use the same atomic batch operation. */
export async function insertStockConfirmation(
  storeId: string,
  itemId: string,
  inStock: boolean,
  idempotencyKey: string,
  confirmedBy?: string,
): Promise<StockConfirmationRow> {
  const result = await confirmStockBatch(storeId, [{ itemId, inStock }], idempotencyKey, confirmedBy);
  return result.confirmations[0];
}

/**
 * Count orders associated with a specific item across stores
 * (used for demand scoring in nudges).
 */
export async function getItemDemandCounts(
  storeId: string,
  windowDays: number = 7,
): Promise<Map<string, number>> {
  if (isDemoStatic()) {
    const counts = new Map<string, number>();
    for (const cat of DEMO_CATALOG) {
      counts.set(`${storeId}-${cat.item_id}`, cat.demand);
    }
    return counts;
  }

  const supabase = getServerSupabase();

  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const { data, error } = await supabase
    .from('order_items')
    .select('item_id, orders!inner(store_id, placed_at)')
    .eq('orders.store_id', storeId)
    .gte('orders.placed_at', since.toISOString());

  if (error) {
    console.warn(`[inventory.repo] Item demand query failed: ${error.message}`);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const itemId = (row as Record<string, unknown>).item_id as string;
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }

  return counts;
}
