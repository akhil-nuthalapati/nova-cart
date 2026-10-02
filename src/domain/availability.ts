/**
 * BUS-005 — Item Availability Confidence (customer side)
 * BUS-006 — Alternate Store / Substitute Suggestion
 * BUS-011 — Retention-Critical Cancellation
 * Pure functions. No I/O.
 */

import type {
  ItemConfidenceResult,
  AlternativeSuggestion,
  RetentionCriticalFlag,
  StalenessResult,
} from './types';
import { ItemConfidence, StaleBand } from './types';
import type { RulesV1 } from '../config/rules.v1';

export interface ItemConfidenceInput {
  item_id: string;
  staleness: StalenessResult;
  recent_unavailable_cancels: number;
}

/**
 * BUS-005: Compute customer-facing availability confidence.
 * Rule: LOW if CRITICAL staleness or >= item_cancel_low recent unavailable-cancels.
 *       MEDIUM if STALE.
 *       HIGH otherwise.
 */
export function computeItemConfidence(
  input: ItemConfidenceInput,
  config: RulesV1['itemConfidence']
): ItemConfidenceResult {
  let confidence: ItemConfidence = ItemConfidence.HIGH;
  let reason = 'Stock is fresh and cancellation rate is low';

  if (
    input.staleness.band === StaleBand.CRITICAL ||
    input.recent_unavailable_cancels >= config.item_cancel_low
  ) {
    confidence = ItemConfidence.LOW;
    reason =
      input.staleness.band === StaleBand.CRITICAL
        ? 'Stock confirmation is overdue (>72h)'
        : `${input.recent_unavailable_cancels} recent orders were cancelled due to stockout`;
  } else if (input.staleness.band === StaleBand.STALE) {
    confidence = ItemConfidence.MEDIUM;
    reason = 'Stock last confirmed 24-72h ago';
  }

  return {
    item_id: input.item_id,
    confidence,
    staleness_band: input.staleness.band,
    recent_unavailable_cancels: input.recent_unavailable_cancels,
    reason,
  };
}

export interface StoreCatalogItem {
  store_id: string;
  store_name: string;
  city: string;
  item_id: string;
  item_name: string;
  category: string;
  confidence: ItemConfidence;
}

/**
 * BUS-006: Suggest alternative stores or substitutes when an item has LOW confidence.
 * Rule: if item is LOW and another same-city store has same catalog item at HIGH -> suggest it.
 *       else suggest same-category substitute with HIGH or MEDIUM confidence.
 */
export function suggestAlternatives(
  targetItem: { item_id: string; category: string; city: string; current_store_id: string },
  inventory: StoreCatalogItem[]
): AlternativeSuggestion[] {
  const suggestions: AlternativeSuggestion[] = [];

  // 1. Same item at another store in the same city with HIGH confidence
  const sameItemOthers = inventory.filter(
    (inv) =>
      inv.item_id === targetItem.item_id &&
      inv.store_id !== targetItem.current_store_id &&
      inv.city === targetItem.city &&
      inv.confidence === ItemConfidence.HIGH
  );

  for (const alt of sameItemOthers) {
    suggestions.push({
      type: 'same_item_other_store',
      store_id: alt.store_id,
      store_name: alt.store_name,
      item_id: alt.item_id,
      item_name: alt.item_name,
      confidence: alt.confidence,
      reason: `Available with verified stock at ${alt.store_name}`,
    });
  }

  // 2. Same category substitute
  const substitutes = inventory.filter(
    (inv) =>
      inv.category === targetItem.category &&
      inv.item_id !== targetItem.item_id &&
      (inv.confidence === ItemConfidence.HIGH || inv.confidence === ItemConfidence.MEDIUM)
  );

  for (const sub of substitutes.slice(0, 3)) {
    suggestions.push({
      type: 'substitute',
      store_id: sub.store_id,
      store_name: sub.store_name,
      item_id: sub.item_id,
      item_name: sub.item_name,
      confidence: sub.confidence,
      reason: `Alternative ${sub.category} item with verified stock`,
    });
  }

  return suggestions;
}

/**
 * BUS-011: Retention-Critical Cancellation Flag
 * Rule: flag any cancellation (inventory-side) on a customer's 1st or 2nd order
 * as RETENTION_CRITICAL -> priority recovery action. Anchor: MET-011/012/013.
 */
export function checkRetentionCritical(
  order: {
    order_id: string;
    customer_id: string;
    sequence_no: number;
    is_inventory_side: boolean;
  }
): RetentionCriticalFlag {
  const isEarlyOrder = order.sequence_no === 1 || order.sequence_no === 2;
  const flagged = isEarlyOrder && order.is_inventory_side;

  return {
    order_id: order.order_id,
    customer_id: order.customer_id,
    sequence_no: order.sequence_no,
    flagged,
    reason: flagged
      ? `Critical churn risk: inventory-side cancellation on customer's order #${order.sequence_no}.`
      : undefined,
  };
}
