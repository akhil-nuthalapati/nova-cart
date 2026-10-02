import { NextResponse } from 'next/server';
import { computeItemConfidence, suggestAlternatives } from '../../../../domain/availability';
import { computeStaleness } from '../../../../domain/reliability';
import { RULES_V1 } from '../../../../config/rules.v1';
import { ItemConfidence } from '../../../../domain/types';
import fs from 'fs';
import path from 'path';

function getDB() {
  const p = path.join(process.cwd(), 'public', 'demo-db.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * API-08: GET /api/availability/confidence
 * Roles: pm, customer demo
 * Purpose: BUS-005 Item Availability Confidence & BUS-006 Alternative Suggestions
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId') || 'store-1';
  const itemIds = (searchParams.get('itemIds') || 'milk-1l,bread-400g,eggs-12').split(',');

  const db = getDB();
  const store = (db.stores || []).find((s: any) => s.id === storeId) || {
    id: storeId,
    name: 'Sample Store',
    city: 'City A',
    last_confirmed_hours_ago: 48,
  };

  const now = new Date();
  const hoursAgo = store.last_confirmed_hours_ago ?? 48;
  const lastConfirmedAt = new Date(now.getTime() - hoursAgo * 3600 * 1000);
  const staleness = computeStaleness(lastConfirmedAt, now, RULES_V1.staleness);

  // Mock catalog with other stores for alternative discovery (BUS-006)
  const catalogInventory = [
    {
      store_id: 'store-2',
      store_name: 'Store 2 (Nearby)',
      city: store.city,
      item_id: 'milk-1l',
      item_name: 'Farm Fresh Whole Milk 1L',
      category: 'dairy',
      confidence: ItemConfidence.HIGH,
    },
    {
      store_id: store.id,
      store_name: store.name,
      city: store.city,
      item_id: 'soymilk-1l',
      item_name: 'Organic Soy Milk 1L',
      category: 'dairy',
      confidence: ItemConfidence.HIGH,
    },
    {
      store_id: 'store-3',
      store_name: 'Store 3',
      city: store.city,
      item_id: 'bread-400g',
      item_name: 'Whole Wheat Bread 400g',
      category: 'bakery',
      confidence: ItemConfidence.HIGH,
    },
  ];

  const results = itemIds.map((itemId) => {
    // Simulate some recent unavailable cancels for demo
    const cancels = itemId.includes('milk') ? 4 : 0;
    const confResult = computeItemConfidence(
      {
        item_id: itemId,
        staleness,
        recent_unavailable_cancels: cancels,
      },
      RULES_V1.itemConfidence
    );

    let alternatives: any[] = [];
    if (confResult.confidence === ItemConfidence.LOW) {
      alternatives = suggestAlternatives(
        {
          item_id: itemId,
          category: itemId.includes('milk') ? 'dairy' : 'bakery',
          city: store.city,
          current_store_id: store.id,
        },
        catalogInventory
      );
    }

    return {
      item_id: itemId,
      confidence: confResult.confidence,
      reason: confResult.reason,
      staleness_band: confResult.staleness_band,
      alternatives,
    };
  });

  return NextResponse.json({
    data: {
      store_id: store.id,
      store_name: store.name,
      city: store.city,
      items: results,
    },
    meta: {
      rule_id: 'BUS-005,BUS-006',
      rule_version: 'v1',
      confidence: 'MEDIUM',
      warnings: [],
      synthetic: true,
    },
  });
}
