/**
 * Inventory Repository — Store items, stock confirmations, nudge data.
 * ARCH-004: queries only, no business logic.
 * Supports dual-mode (Supabase vs demo JSON).
 */

import { getServerSupabase, isDemoStatic } from '../../lib/supabase';
import {
  getDemoDB,
  checkDemoIdempotencyKey,
  recordDemoIdempotencyKey,
  updateDemoStoreStaleness,
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

    return DEMO_CATALOG.map((cat, idx) => ({
      store_id: storeId,
      item_id: `${storeId}-${cat.item_id}`,
      item_name: cat.name,
      category: cat.category,
      in_stock: true,
      last_confirmed_at: new Date(Date.now() - (hours + idx * 2) * 3600 * 1000).toISOString(),
      demand_score: cat.demand,
      hours_since_confirmed: Math.max(0, hours + (idx % 3 === 0 ? 6 : -4)),
    }));
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

    return stores.map((s) => ({
      store_id: s.id,
      avg_hours_since_confirmed: s.last_confirmed_hours_ago,
      total_items: 10,
      in_stock_count: 10,
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

/**
 * Submit a stock confirmation (append-only).
 * Returns the created confirmation row.
 */
export async function insertStockConfirmation(
  storeId: string,
  itemId: string,
  inStock: boolean,
  idempotencyKey: string,
  confirmedBy?: string,
): Promise<StockConfirmationRow> {
  if (isDemoStatic()) {
    if (checkDemoIdempotencyKey(idempotencyKey)) {
      throw new Error(`DUPLICATE_IDEMPOTENCY_KEY: ${idempotencyKey}`);
    }
    recordDemoIdempotencyKey(idempotencyKey);
    updateDemoStoreStaleness(storeId, 0);

    return {
      id: `conf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      store_id: storeId,
      item_id: itemId,
      in_stock: inStock,
      idempotency_key: idempotencyKey,
      confirmed_by: confirmedBy ?? null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = getServerSupabase();

  // Insert the confirmation record
  const { data: confirmRow, error: confirmError } = await supabase
    .from('stock_confirmations')
    .insert({
      store_id: storeId,
      item_id: itemId,
      in_stock: inStock,
      idempotency_key: idempotencyKey,
      confirmed_by: confirmedBy ?? null,
    })
    .select()
    .single();

  if (confirmError) {
    if (confirmError.code === '23505') {
      throw new Error(`DUPLICATE_IDEMPOTENCY_KEY: ${idempotencyKey}`);
    }
    throw new Error(`[inventory.repo] Confirmation insert failed: ${confirmError.message}`);
  }

  // Update the store_items table
  const { error: updateError } = await supabase
    .from('store_items')
    .update({
      in_stock: inStock,
      last_confirmed_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)
    .eq('item_id', itemId);

  if (updateError) {
    console.error(`[inventory.repo] store_items update failed: ${updateError.message}`);
  }

  return confirmRow as StockConfirmationRow;
}

/**
 * Check if an idempotency key already exists.
 */
export async function checkIdempotencyKey(key: string): Promise<boolean> {
  if (isDemoStatic()) {
    return checkDemoIdempotencyKey(key);
  }

  const supabase = getServerSupabase();

  const { count, error } = await supabase
    .from('stock_confirmations')
    .select('*', { count: 'exact', head: true })
    .eq('idempotency_key', key);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
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
