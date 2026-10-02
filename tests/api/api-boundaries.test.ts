import { describe, expect, it } from 'vitest';
import { POST as growthPost, GET as growthGet } from '../../src/app/api/growth/route';
import { GET as verdictGet } from '../../src/app/api/growth/verdict/route';
import { GET as cancellationsGet } from '../../src/app/api/cancellations/breakdown/route';
import { POST as scenarioPost } from '../../src/app/api/scenarios/impact/route';
import { GET as reliabilityGet } from '../../src/app/api/stores/reliability/route';
import { POST as resetSeedPost } from '../../src/app/api/dev/reset-seed/route';
import { computeSRS } from '../../src/domain/reliability';
import { prioritizeNudges } from '../../src/domain/nudges';
import { RULES_V1 } from '../../src/config/rules.v1';

describe('API Boundaries & Quality Rigor', () => {
  it('rejects negative marketing spend with HTTP 400 in /api/growth', async () => {
    const req = new Request('http://localhost:3000/api/growth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed_increase: -50000 }),
    });

    const res = await growthPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects non-numeric marketing spend with HTTP 400 in /api/growth', async () => {
    const req = new Request('http://localhost:3000/api/growth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed_increase: 'lots_of_money' }),
    });

    const res = await growthPost(req);
    expect(res.status).toBe(400);
  });

  it('evaluates valid marketing spend and returns HOLD decision when guardrails decline', async () => {
    const req = new Request('http://localhost:3000/api/growth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed_increase: 510000 }),
    });

    const res = await growthPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.decision).toBe('HOLD_INCREMENTAL_ACQUISITION');
  });

  it('returns baseline growth verdict with Cache-Control on GET /api/growth', async () => {
    const res = await growthGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
    const json = await res.json();
    expect(json.verdict).toBe('GROWTH_WITH_QUALITY_DECLINE');
  });

  it('returns Cache-Control headers on /api/growth/verdict', async () => {
    const res = await verdictGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
    const json = await res.json();
    expect(json.data.verdict).toBe('GROWTH_WITH_QUALITY_DECLINE');
  });

  it('returns Cache-Control headers on /api/cancellations/breakdown', async () => {
    const res = await cancellationsGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
    const json = await res.json();
    expect(json.data.inventory_side_count).toBe(2244);
  });

  it('rejects reduction < 0 in /api/scenarios/impact with HTTP 400', async () => {
    const req = new Request('http://localhost:3000/api/scenarios/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reduction: -0.1 }),
    });

    const res = await scenarioPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects reduction > 1 in /api/scenarios/impact with HTTP 400', async () => {
    const req = new Request('http://localhost:3000/api/scenarios/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reduction: 1.5 }),
    });

    const res = await scenarioPost(req);
    expect(res.status).toBe(400);
  });

  it('handles invalid limit and page parameters gracefully in /api/stores/reliability', async () => {
    const req = new Request('http://localhost:3000/api/stores/reliability?limit=invalid&page=xyz');
    const res = await reliabilityGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pagination.limit).toBe(50);
    expect(json.pagination.page).toBe(1);
    expect(res.headers.get('Cache-Control')).toContain('max-age=10');
  });

  it('filters stores by city correctly in /api/stores/reliability', async () => {
    const req = new Request('http://localhost:3000/api/stores/reliability?city=City%20A');
    const res = await reliabilityGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.every((s: { city: string }) => s.city.toLowerCase() === 'city a')).toBe(true);
  });

  it('disables dev reset-seed endpoint when NODE_ENV is production', async () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
      const res = await resetSeedPost();
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    } finally {
      (process.env as Record<string, string | undefined>)['NODE_ENV'] = origEnv;
    }
  });

  it('safely clamps SRS scores within [0, 100] even with extreme baselines', () => {
    const extremeConfig = {
      ...RULES_V1.srs,
      baselines: {
        unavail_cancel_rate: 0,
        reject_rate: 0,
      },
    };

    const res = computeSRS(
      {
        r_stale: 5.0, // out of bounds
        store_unavail_rate: 0.5,
        store_reject_rate: 0.5,
        orders_in_window: 100,
      },
      extremeConfig
    );

    expect(res.srs).toBeGreaterThanOrEqual(0);
    expect(res.srs).toBeLessThanOrEqual(100);
    expect(Number.isNaN(res.srs)).toBe(false);
  });

  it('prioritizes nudges defensively against negative or invalid hours', () => {
    const input = {
      items: [
        { item_id: 'i1', item_name: 'Item 1', demand_score: -10, hours_since_confirmed: -5 },
        { item_id: 'i2', item_name: 'Item 2', demand_score: 50, hours_since_confirmed: 80 },
      ],
    };

    const nudges = prioritizeNudges(input, RULES_V1.nudge, RULES_V1.staleness);
    expect(nudges.length).toBe(1);
    expect(nudges[0].item_id).toBe('i2');
    expect(nudges[0].priority).toBe(50);
  });
});
