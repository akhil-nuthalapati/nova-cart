import { describe, it, expect } from 'vitest';
import {
  metricsRepo,
  ordersRepo,
  storesRepo,
  inventoryRepo,
  ticketsRepo,
} from '../../src/server/repositories';

describe('Server Repositories (Dual-Mode / Demo Mode)', () => {
  describe('metricsRepo', () => {
    it('fetches baseline and current metric snapshots matching canonical values', async () => {
      const { baseline, current } = await metricsRepo.getMetricSnapshots();

      expect(baseline).not.toBeNull();
      expect(current).not.toBeNull();

      // Canonical MET-001..010 values
      expect(baseline?.met001_registered_users).toBe(82000);
      expect(baseline?.met003_monthly_orders).toBe(31200);
      expect(baseline?.met007_cancellation_rate).toBe(0.06);

      expect(current?.met001_registered_users).toBe(120000);
      expect(current?.met003_monthly_orders).toBe(38500);
      expect(current?.met007_cancellation_rate).toBe(0.11);
    });

    it('fetches active rule configuration', async () => {
      const rules = await metricsRepo.getActiveRuleConfig();
      expect(rules).not.toBeNull();
      expect(rules?.srs).toBeDefined();
      expect(rules?.staleness).toBeDefined();
    });
  });

  describe('ticketsRepo', () => {
    it('fetches platform-wide ticket breakdown summing to canonical 5900', async () => {
      const breakdown = await ticketsRepo.getTicketBreakdown();

      expect(breakdown.missing_unavailable).toBe(1121);
      expect(breakdown.refund_status).toBe(1711);
      expect(breakdown.delayed_delivery).toBe(1416);

      const totalTickets = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
      expect(totalTickets).toBe(5900);
    });

    it('fetches ticket count by specific category', async () => {
      const missingCount = await ticketsRepo.getTicketCountByCategory('missing_unavailable');
      expect(missingCount).toBe(1121);
    });
  });

  describe('ordersRepo', () => {
    it('fetches cancellation breakdown matching DER-006 / GOLD-01', async () => {
      const breakdown = await ordersRepo.getCancellationBreakdown();

      expect(breakdown.total_orders).toBe(38500);
      expect(breakdown.total_cancelled).toBe(4235);
      expect(breakdown.unavailable).toBe(1482);
      expect(breakdown.store_rejected).toBe(762);
      expect(breakdown.customer_delay).toBe(1143);
      expect(breakdown.partner_unavailable).toBe(508);
      expect(breakdown.other_reason).toBeGreaterThanOrEqual(339);
      expect(breakdown.other_reason).toBeLessThanOrEqual(340);
    });

    it('filters cancellation breakdown by city', async () => {
      const cityBreakdown = await ordersRepo.getCancellationBreakdown('City A');
      expect(cityBreakdown.total_orders).toBeGreaterThan(0);
      expect(cityBreakdown.total_orders).toBeLessThan(38500);
    });

    it('fetches platform inventory cancellation count', async () => {
      const count = await ordersRepo.getInventoryCancellationCount();
      expect(count).toBe(1482 + 762); // 2245
    });

    it('fetches store order stats', async () => {
      const stats = await ordersRepo.getStoreOrderStats(['store-1', 'store-2']);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('total_orders');
      expect(stats[0]).toHaveProperty('unavail_cancels');
    });
  });

  describe('storesRepo', () => {
    it('retrieves stores with filtering', async () => {
      const allStores = await storesRepo.getStores({ limit: 10 });
      expect(allStores.length).toBe(10);
      expect(allStores[0]).toHaveProperty('id');
      expect(allStores[0]).toHaveProperty('city_name');

      const cityAStores = await storesRepo.getStores({ city: 'City A', limit: 5 });
      expect(cityAStores.every((s) => s.city_name === 'City A')).toBe(true);
    });

    it('retrieves single store by ID', async () => {
      const store = await storesRepo.getStoreById('store-1');
      expect(store).not.toBeNull();
      expect(store?.id).toBe('store-1');
      expect(store?.city_name).toBe('City A');
    });

    it('returns null for non-existent store ID', async () => {
      const store = await storesRepo.getStoreById('non-existent-store-xyz');
      expect(store).toBeNull();
    });
  });

  describe('inventoryRepo', () => {
    it('fetches store items for nudges and catalog', async () => {
      const items = await inventoryRepo.getStoreItems('store-1');
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('item_id');
      expect(items[0]).toHaveProperty('item_name');
    });

    it('records stock confirmations with idempotency', async () => {
      const key = `test-idem-${Date.now()}`;
      const result = await inventoryRepo.insertStockConfirmation(
        'store-1', 'store-1-item-1', false, key
      );
      expect(result.in_stock).toBe(false);
      expect(await inventoryRepo.insertStockConfirmation('store-1', 'store-1-item-1', false, key))
        .toEqual(result);
      expect((await inventoryRepo.getStoreItems('store-1'))[0].in_stock).toBe(false);
    });
  });
});
