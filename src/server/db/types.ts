/**
 * Database Types — TypeScript interfaces for Supabase table rows.
 * These mirror the SQL schema in supabase/migrations/00002_full_schema.sql.
 */

export interface CityRow {
  id: string;
  name: string;
  created_at: string;
}

export interface StoreRow {
  id: string;
  city_id: string;
  name: string;
  category: 'grocery' | 'pharmacy' | 'bakery' | 'stationery' | 'other';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogItemRow {
  id: string;
  name: string;
  category: string;
  base_price_paise: number;
  created_at: string;
}

export interface StoreItemRow {
  store_id: string;
  item_id: string;
  in_stock: boolean;
  last_confirmed_at: string | null;
  updated_at: string;
}

export interface StockConfirmationRow {
  id: string;
  store_id: string;
  item_id: string;
  in_stock: boolean;
  idempotency_key: string;
  confirmed_by: string | null;
  created_at: string;
}

export interface CustomerRow {
  id: string;
  created_at: string;
}

export interface OrderRow {
  id: string;
  customer_id: string | null;
  store_id: string;
  placed_at: string;
  order_value_paise: number;
  status: 'placed' | 'delivered' | 'cancelled';
  sequence_no: number;
  delivered_at: string | null;
  created_at: string;
}

export interface CancellationRow {
  order_id: string;
  reason: 'unavailable' | 'customer_delay' | 'store_rejected' | 'partner_unavailable' | 'other';
  item_id: string | null;
  created_at: string;
}

export interface SupportTicketRow {
  id: string;
  order_id: string | null;
  category: 'refund_status' | 'delayed_delivery' | 'missing_unavailable' | 'coupon' | 'incorrect_order' | 'other';
  opened_at: string;
  resolved_at: string | null;
}

export interface MetricSnapshotRow {
  id: string;
  period: 'baseline' | 'current';
  payload: Record<string, number>;
  source: string | null;
  created_at: string;
}

export interface RuleConfigRow {
  version: string;
  payload: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

// ── View types (from SQL views) ──

export interface StoreOrderStatsView {
  store_id: string;
  total_orders: number;
  total_cancelled: number;
  unavail_cancels: number;
  reject_cancels: number;
  inventory_cancels: number;
  unavail_rate: number;
  reject_rate: number;
}

export interface CancellationBreakdownView {
  total_orders: number;
  total_cancelled: number;
  unavailable: number;
  customer_delay: number;
  store_rejected: number;
  partner_unavailable: number;
  other_reason: number;
}

export interface TicketBreakdownView {
  category: string;
  ticket_count: number;
}

export interface StoreFreshnessView {
  store_id: string;
  store_name: string;
  city_name: string;
  category: string;
  avg_hours_since_confirmed: number;
  oldest_confirmation: string;
  total_items: number;
  in_stock_count: number;
}
