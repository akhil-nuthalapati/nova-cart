import { describe, it, expect } from 'vitest';
import {
  computeItemConfidence,
  suggestAlternatives,
  checkRetentionCritical,
} from '../../src/domain/availability';
import { ItemConfidence, StaleBand } from '../../src/domain/types';
import { RULES_V1 } from '../../src/config/rules.v1';

describe('BUS-005: Item Availability Confidence', () => {
  it('TEST-BUS-005: Flags LOW confidence for CRITICAL staleness or >= 3 recent cancels', () => {
    // Fresh stock, 0 cancels -> HIGH
    const fresh = computeItemConfidence(
      {
        item_id: 'item-1',
        staleness: { hours: 12, band: StaleBand.FRESH, r_stale: 0.16 },
        recent_unavailable_cancels: 0,
      },
      RULES_V1.itemConfidence
    );
    expect(fresh.confidence).toBe(ItemConfidence.HIGH);

    // Stale stock (24-72h), 0 cancels -> MEDIUM
    const stale = computeItemConfidence(
      {
        item_id: 'item-2',
        staleness: { hours: 36, band: StaleBand.STALE, r_stale: 0.5 },
        recent_unavailable_cancels: 1,
      },
      RULES_V1.itemConfidence
    );
    expect(stale.confidence).toBe(ItemConfidence.MEDIUM);

    // Critical staleness (>72h) -> LOW
    const criticalStale = computeItemConfidence(
      {
        item_id: 'item-3',
        staleness: { hours: 80, band: StaleBand.CRITICAL, r_stale: 1 },
        recent_unavailable_cancels: 0,
      },
      RULES_V1.itemConfidence
    );
    expect(criticalStale.confidence).toBe(ItemConfidence.LOW);

    // High recent cancels (>= 3) -> LOW
    const highCancels = computeItemConfidence(
      {
        item_id: 'item-4',
        staleness: { hours: 10, band: StaleBand.FRESH, r_stale: 0.14 },
        recent_unavailable_cancels: 4,
      },
      RULES_V1.itemConfidence
    );
    expect(highCancels.confidence).toBe(ItemConfidence.LOW);
  });
});

describe('BUS-006: Alternate Store / Substitute Suggestion', () => {
  it('TEST-BUS-006: Suggests same item at another store in same city, or category substitute', () => {
    const targetItem = {
      item_id: 'milk-1l',
      category: 'dairy',
      city: 'City A',
      current_store_id: 'store-1',
    };

    const inventory = [
      {
        store_id: 'store-2',
        store_name: 'Store 2',
        city: 'City A',
        item_id: 'milk-1l',
        item_name: 'Organic Whole Milk 1L',
        category: 'dairy',
        confidence: ItemConfidence.HIGH,
      },
      {
        store_id: 'store-3',
        store_name: 'Store 3',
        city: 'City B', // Different city, should NOT match same-item other store
        item_id: 'milk-1l',
        item_name: 'Organic Whole Milk 1L',
        category: 'dairy',
        confidence: ItemConfidence.HIGH,
      },
      {
        store_id: 'store-1',
        store_name: 'Store 1',
        city: 'City A',
        item_id: 'soymilk-1l',
        item_name: 'Soy Milk 1L',
        category: 'dairy',
        confidence: ItemConfidence.HIGH,
      },
    ];

    const suggestions = suggestAlternatives(targetItem, inventory);
    expect(suggestions.length).toBeGreaterThan(0);

    const sameStoreAlt = suggestions.find((s) => s.type === 'same_item_other_store');
    expect(sameStoreAlt).toBeDefined();
    expect(sameStoreAlt?.store_id).toBe('store-2');

    const substitute = suggestions.find((s) => s.type === 'substitute');
    expect(substitute).toBeDefined();
    expect(substitute?.item_id).toBe('soymilk-1l');
  });
});

describe('BUS-011: Retention-Critical Cancellation', () => {
  it('TEST-BUS-011: Flags cancellation on 1st or 2nd order if inventory-side', () => {
    // 1st order, inventory-side -> FLAGGED
    const order1 = checkRetentionCritical({
      order_id: 'ord-1',
      customer_id: 'cust-1',
      sequence_no: 1,
      is_inventory_side: true,
    });
    expect(order1.flagged).toBe(true);
    expect(order1.reason).toContain('Critical churn risk');

    // 2nd order, inventory-side -> FLAGGED
    const order2 = checkRetentionCritical({
      order_id: 'ord-2',
      customer_id: 'cust-2',
      sequence_no: 2,
      is_inventory_side: true,
    });
    expect(order2.flagged).toBe(true);

    // 3rd order, inventory-side -> NOT FLAGGED
    const order3 = checkRetentionCritical({
      order_id: 'ord-3',
      customer_id: 'cust-3',
      sequence_no: 3,
      is_inventory_side: true,
    });
    expect(order3.flagged).toBe(false);

    // 1st order, delivery-side -> NOT FLAGGED
    const order1Delivery = checkRetentionCritical({
      order_id: 'ord-4',
      customer_id: 'cust-4',
      sequence_no: 1,
      is_inventory_side: false,
    });
    expect(order1Delivery.flagged).toBe(false);
  });
});
