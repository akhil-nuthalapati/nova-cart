/**
 * Stores Repository — Store listing, filtering, reliability data.
 * ARCH-004: queries only, no business logic.
 * Supports dual-mode (Supabase vs demo JSON).
 */

import { getServerSupabase, isDemoStatic } from '../../lib/supabase';
import { getDemoDB } from '../db/json-store';

export interface StoreWithCity {
  id: string;
  name: string;
  city_name: string;
  category: string;
  active: boolean;
  last_confirmed_hours_ago?: number;
}

/**
 * Fetch stores with optional filters (city, category, limit).
 */
export async function getStores(filters?: {
  city?: string;
  category?: string;
  limit?: number;
}): Promise<StoreWithCity[]> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    let list = db.stores.filter((s) => s.status === 'active');

    if (filters?.city) {
      const c = filters.city.toLowerCase();
      list = list.filter((s) => s.city.toLowerCase() === c);
    }

    if (filters?.category) {
      const cat = filters.category.toLowerCase();
      list = list.filter((s) => s.category.toLowerCase() === cat);
    }

    if (filters?.limit) {
      list = list.slice(0, filters.limit);
    }

    return list.map((s) => ({
      id: s.id,
      name: s.name,
      city_name: s.city,
      category: s.category,
      active: true,
      last_confirmed_hours_ago: s.last_confirmed_hours_ago,
    }));
  }

  const supabase = getServerSupabase();

  let query = supabase
    .from('stores')
    .select('id, name, category, active, cities!inner(name)')
    .eq('active', true);

  if (filters?.city) {
    query = query.eq('cities.name', filters.city);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[stores.repo] Failed to fetch stores: ${error.message}`);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    city_name: ((row.cities as Record<string, string>)?.name) ?? 'Unknown',
    category: row.category as string,
    active: row.active as boolean,
  }));
}

/**
 * Fetch a single store by ID with city info.
 */
export async function getStoreById(storeId: string): Promise<StoreWithCity | null> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    const s = db.stores.find((st) => st.id === storeId);
    if (!s) return null;

    return {
      id: s.id,
      name: s.name,
      city_name: s.city,
      category: s.category,
      active: s.status === 'active',
      last_confirmed_hours_ago: s.last_confirmed_hours_ago,
    };
  }

  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, category, active, cities!inner(name)')
    .eq('id', storeId)
    .single();

  if (error) {
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    city_name: ((row.cities as Record<string, string>)?.name) ?? 'Unknown',
    category: row.category as string,
    active: row.active as boolean,
  };
}
