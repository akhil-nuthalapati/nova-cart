/**
 * Tickets Repository — Support ticket aggregations.
 * ARCH-004: queries only, no business logic.
 */

import { getServerSupabase, isDemoStatic } from '../../lib/supabase';
import { getDemoDB } from '../db/json-store';

export type TicketCategory =
  | 'refund_status'
  | 'delayed_delivery'
  | 'missing_unavailable'
  | 'coupon'
  | 'incorrect_order'
  | 'other';

/**
 * Fetch platform-wide support ticket breakdown by category.
 */
export async function getTicketBreakdown(): Promise<Record<string, number>> {
  if (isDemoStatic()) {
    const db = getDemoDB();
    return { ...db.tickets };
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('v_ticket_breakdown')
    .select('category, ticket_count');

  if (error) {
    throw new Error(`[tickets.repo] Failed to fetch tickets: ${error.message}`);
  }

  const breakdown: Record<string, number> = {};
  for (const row of data || []) {
    breakdown[row.category] = row.ticket_count;
  }
  return breakdown;
}

/**
 * Fetch total tickets for a specific category (e.g., 'missing_unavailable').
 */
export async function getTicketCountByCategory(category: string): Promise<number> {
  const breakdown = await getTicketBreakdown();
  return breakdown[category] ?? 0;
}
