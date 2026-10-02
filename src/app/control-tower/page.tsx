'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CancellationData {
  total_orders: number;
  total_cancelled: number;
  cancellation_rate: number;
  by_reason: Record<string, number>;
  shares: Record<string, number>;
  inventory_side_count: number;
  inventory_side_share_of_orders: number;
  delivery_side_count: number;
  delivery_side_share_of_orders: number;
}

interface StoreRow {
  store_id: string;
  name: string;
  city: string;
  category: string;
  last_confirmed_hours_ago: number;
  orders_30d: number;
  cancels_30d: number;
  srs: number;
  band: 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'INSUFFICIENT_DATA';
  components: {
    r_stale: number;
    r_unavail: number;
    r_reject: number;
    risk: number;
  };
}

interface ScenarioData {
  reduction: number;
  baseline_inventory_cancels: number;
  recovered_orders: number;
  gmv_recovered: number;
  revenue_recovered: number;
  tickets_avoided: number;
  unknowns: Array<{ name: string; description: string; label: string }>;
  lim3_note: string;
}

interface Intervention {
  store_id: string;
  store_name: string;
  srs: number;
  band: string;
  recommended_action: string;
  expected_avoided_orders: number;
  confidence: string;
  cost_estimate: string;
}

interface BudgetGuard {
  total_cost_known: number;
  total_cost_unresolved: number;
  has_unresolved: boolean;
  exceeds_cap: boolean;
  cap: number;
  warnings: string[];
}

export default function ControlTowerPage() {
  const [cancellation, setCancellation] = useState<CancellationData | null>(null);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('srs_asc');

  // Scenario Simulator
  const [reduction, setReduction] = useState<number>(0.25); // Default 25% (GOLD-04)
  const [scenarioResult, setScenarioResult] = useState<ScenarioData | null>(null);

  // Interventions & Budget
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [budgetGuard, setBudgetGuard] = useState<BudgetGuard | null>(null);

  // Load Initial Breakdown, Interventions, and Default Scenario (25% GOLD-04)
  useEffect(() => {
    Promise.all([
      fetch('/api/cancellations/breakdown').then((r) => r.json()),
      fetch('/api/interventions?reduction=0.25&limit=8').then((r) => r.json()),
      fetch('/api/scenarios/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reduction: 0.25 }),
      }).then((r) => r.json()),
    ])
      .then(([breakdownRes, interventionsRes, scenarioRes]) => {
        if (breakdownRes.data) setCancellation(breakdownRes.data);
        if (interventionsRes.data) {
          setInterventions(interventionsRes.data.interventions);
          setBudgetGuard(interventionsRes.data.budget_guard);
        }
        if (scenarioRes.data) {
          setScenarioResult(scenarioRes.data);
        }
      })
      .catch((err) => console.error('Failed to load initial data:', err));
  }, []);

  // Fetch Stores with Filters (with AbortController for network efficiency)
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (cityFilter) params.append('city', cityFilter);
    if (categoryFilter) params.append('category', categoryFilter);
    if (bandFilter) params.append('band', bandFilter);
    if (sortOrder) params.append('sort', sortOrder);
    params.append('limit', '40');

    fetch(`/api/stores/reliability?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setStores(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load stores:', err);
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [cityFilter, categoryFilter, bandFilter, sortOrder]);

  // Run Scenario Calculation (API-06)
  const runScenario = (rValue: number) => {
    setReduction(rValue);
    fetch('/api/scenarios/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reduction: rValue }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setScenarioResult(data.data);
      })
      .catch((err) => {
        console.error('Scenario simulation failed:', err);
      });
  };

  const getBandBadge = (band: string) => {
    switch (band) {
      case 'HEALTHY':
        return 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700';
      case 'WATCH':
        return 'bg-zinc-200 text-zinc-800 border-zinc-400 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600';
      case 'AT_RISK':
        return 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white font-bold';
      default:
        return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-10">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
              SCR-02 • Operations Control Tower
            </span>
            <span className="text-xs text-zinc-500">Target Role: Partner Manager</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
            Availability Guard & Control Tower
          </h1>
          <p className="text-zinc-500 mt-1 max-w-2xl text-sm">
            Diagnoses inventory-side order cancellations across 620 stores and drives targeted one-tap stock confirmations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/executive"
            className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            &larr; Executive View
          </Link>
          <a
            href="#scenario-simulator"
            className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            Simulate Impact &darr;
          </a>
        </div>
      </div>

      {/* ── 1. CANCELLATION DECOMPOSITION (BUS-002 / GOLD-01) ── */}
      {cancellation && (
        <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                  BUS-002 • Root Cause Decomposition
                </span>
                <span className="text-xs text-zinc-500">GOLD-01 Benchmark</span>
              </div>
              <h2 className="text-2xl font-black text-zinc-950 dark:text-white mt-1">
                Where are Cancellations Happening?
              </h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-zinc-950 dark:text-white font-mono">
                {cancellation.total_cancelled.toLocaleString()} orders
              </div>
              <div className="text-xs text-zinc-500 font-medium">
                {(cancellation.cancellation_rate * 100).toFixed(1)}% of {cancellation.total_orders.toLocaleString()} total orders
              </div>
            </div>
          </div>

          {/* Key Insight Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-lg shadow-sm">
                53%
              </div>
              <div>
                <div className="font-bold text-zinc-950 dark:text-white text-sm">
                  Inventory-Side Failures (In Scope v1)
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  <strong>{cancellation.inventory_side_count.toLocaleString()} orders</strong> ({(cancellation.inventory_side_share_of_orders * 100).toFixed(1)}% of all platform volume). Avoidable with stock confirmations.
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center gap-4 opacity-80">
              <div className="w-12 h-12 rounded-lg bg-zinc-300 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-lg">
                39%
              </div>
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-200 text-sm">
                  Delivery Delay & Partner (Out of Scope v1)
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  <strong>{cancellation.delivery_side_count.toLocaleString()} orders</strong> (27% customer delay + 12% partner unavail). Disclosed per LIM-2.
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Reason Breakdown Bar & Grid */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cancellation Mix (MET-015)</div>
            {/* Visual stacked bar */}
            <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner text-[10px] font-bold text-white text-center leading-6 border border-zinc-300 dark:border-zinc-700">
              <div style={{ width: '35%' }} className="bg-black text-white truncate" title="Unavailable (35%)">
                Unavailable 35%
              </div>
              <div style={{ width: '18%' }} className="bg-zinc-700 text-white truncate" title="Store Rejected (18%)">
                Rejected 18%
              </div>
              <div style={{ width: '27%' }} className="bg-zinc-500 text-white truncate" title="Delay (27%)">
                Delay 27%
              </div>
              <div style={{ width: '12%' }} className="bg-zinc-400 text-zinc-900 truncate" title="Partner Unavail (12%)">
                Partner 12%
              </div>
              <div style={{ width: '8%' }} className="bg-zinc-300 text-zinc-900 truncate" title="Other (8%)">
                8%
              </div>
            </div>

            {/* Individual reason pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Inventory: Unavailable</span>
                <div className="text-lg font-bold font-mono text-zinc-950 dark:text-white mt-0.5">
                  {cancellation.by_reason.unavailable.toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500">35% share of cancels</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Inventory: Store Rejected</span>
                <div className="text-lg font-bold font-mono text-zinc-950 dark:text-white mt-0.5">
                  {cancellation.by_reason.store_rejected.toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500">18% share of cancels</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Customer Delay (LIM-2)</span>
                <div className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {cancellation.by_reason.customer_delay.toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500">27% share (out of scope)</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Partner Unavail (LIM-2)</span>
                <div className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {cancellation.by_reason.partner_unavailable.toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500">12% share (out of scope)</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Other Causes</span>
                <div className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {cancellation.by_reason.other.toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500">8% share</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. SCENARIO IMPACT SIMULATOR (BUS-009 / API-06) ── */}
      <div id="scenario-simulator" className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                BUS-009 • Interactive Simulation
              </span>
              <span className="text-xs text-zinc-500 font-semibold">Scenario, Not Forecast</span>
            </div>
            <h2 className="text-2xl font-black text-zinc-950 dark:text-white mt-1">
              Avoidable Cancellation Impact Simulator
            </h2>
            <p className="text-xs text-zinc-500">
              Evaluates business impact across order volume, recovered GMV, revenue, and avoided support tickets.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 mr-1">Presets:</span>
            {[0.1, 0.25, 0.5].map((preset) => (
              <button
                key={preset}
                onClick={() => runScenario(preset)}
                className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                  reduction === preset
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200'
                }`}
              >
                {preset * 100}% {preset === 0.25 ? '(GOLD-04)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Inventory Cancellation Reduction Target: <span className="text-zinc-950 dark:text-white font-black text-base ml-1">{(reduction * 100).toFixed(0)}%</span>
            </span>
            <span className="text-xs font-mono text-zinc-400">Range: 0% to 100%</span>
          </div>
          <input
            id="reduction-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={reduction}
            onChange={(e) => runScenario(parseFloat(e.target.value))}
            aria-label="Avoidable inventory cancellation reduction target"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(reduction * 100)}
            aria-valuetext={`${Math.round(reduction * 100)} percent reduction target`}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
          />
        </div>

        {/* Recalculated Values */}
        {scenarioResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 uppercase">Recovered Orders</span>
              <div className="text-2xl font-black font-mono text-zinc-950 dark:text-white mt-1">
                {scenarioResult.recovered_orders.toLocaleString()}
              </div>
              <span className="text-[11px] text-zinc-500">from 2,245 baseline</span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 uppercase">Recovered GMV</span>
              <div className="text-2xl font-black font-mono text-zinc-950 dark:text-white mt-1">
                ₹{(scenarioResult.gmv_recovered / 100000).toFixed(2)}L
              </div>
              <span className="text-[11px] text-zinc-500">at ₹486 AOV (ASM-008)</span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 uppercase">Direct Revenue (ASM-001)</span>
              <div className="text-2xl font-black font-mono text-zinc-950 dark:text-white mt-1">
                ₹{(scenarioResult.revenue_recovered / 100000).toFixed(2)}L
              </div>
              <span className="text-[11px] text-zinc-500">₹67.79 / order (DER-011)</span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 uppercase">Avoided Support Tickets</span>
              <div className="text-2xl font-black font-mono text-zinc-950 dark:text-white mt-1">
                {scenarioResult.tickets_avoided.toLocaleString()}
              </div>
              <span className="text-[11px] text-zinc-500">out of 1,121 stockout tickets</span>
            </div>
          </div>
        )}

        {/* Honest Disclosure: UNKNOWN Lines & LIM-3 Note */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-wider">
            <span>Honest Disclosures & Unknown Lines (LIM-3)</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            <strong>LIM-3:</strong> Direct recovered platform revenue (₹{(scenarioResult?.revenue_recovered ? (scenarioResult.revenue_recovered / 100000).toFixed(2) : '0.38')}L) is small. The strategic value case rests on avoiding customer churn, partner store fatigue, and support overhead.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-2.5 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Customer Retention: </span>
              <span className="text-zinc-900 dark:text-zinc-100 font-mono font-bold uppercase text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded ml-1">
                UNKNOWN
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">Quantifying LTV delta requires cohort tracking data.</p>
            </div>
            <div className="p-2.5 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Support Savings (₹): </span>
              <span className="text-zinc-900 dark:text-zinc-100 font-mono font-bold uppercase text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded ml-1">
                UNKNOWN
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">Tickets avoided are known; exact cost per ticket is missing.</p>
            </div>
            <div className="p-2.5 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Partner Store Churn: </span>
              <span className="text-zinc-900 dark:text-zinc-100 font-mono font-bold uppercase text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded ml-1">
                UNKNOWN
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">18% of stores considering leaving; saving stores prevents supply death.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. OPS INTERVENTIONS & BUDGET GUARD (BUS-008 & BUS-012) ── */}
      {budgetGuard && (
        <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                  BUS-008 & BUS-012 • Operations & Budget Guard
                </span>
                <span className="text-xs text-zinc-500">Cap: ₹25L (MET-023)</span>
              </div>
              <h2 className="text-2xl font-black text-zinc-950 dark:text-white mt-1">
                Priority Store Interventions
              </h2>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Known Cost: <span className="font-mono font-bold text-zinc-950 dark:text-white">₹{budgetGuard.total_cost_known.toLocaleString()}</span> / ₹25L
              </div>
              <div className="text-xs text-zinc-500 font-medium">
                {budgetGuard.total_cost_unresolved} intervention(s) with cost marked UNRESOLVED
              </div>
            </div>
          </div>

          {/* Intervention Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {interventions.map((item) => (
              <div
                key={item.store_id}
                className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-950 dark:text-white text-sm">{item.store_name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getBandBadge(item.band)}`}>
                      SRS {item.srs}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2">
                    <strong className="text-zinc-800 dark:text-zinc-200">Action: </strong>
                    {item.recommended_action}
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Avoidable Cancels</span>
                    <span className="font-mono font-bold text-zinc-950 dark:text-white">+{item.expected_avoided_orders}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block text-[10px]">Cost Estimate</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{item.cost_estimate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Budget Warnings */}
          {budgetGuard.warnings.length > 0 && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
              {budgetGuard.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span>•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. STORE RELIABILITY DIRECTORY (BUS-003, BUS-004) ── */}
      <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                BUS-003 & BUS-004 • Directory
              </span>
              <span className="text-xs text-zinc-500">620 Stores Across 3 Cities</span>
            </div>
            <h2 className="text-2xl font-black text-zinc-950 dark:text-white mt-1">
              Store Reliability Score (SRS) Directory
            </h2>
          </div>

          {/* Interactive Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              aria-label="Filter stores by city"
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            >
              <option value="">All Cities</option>
              <option value="City A">City A</option>
              <option value="City B">City B</option>
              <option value="City C">City C</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter stores by category"
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            >
              <option value="">All Categories</option>
              <option value="grocery">Grocery</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="bakery">Bakery</option>
              <option value="stationery">Stationery</option>
              <option value="other">Other</option>
            </select>

            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
              aria-label="Filter stores by reliability band"
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            >
              <option value="">All Bands</option>
              <option value="AT_RISK">At Risk (&lt;60)</option>
              <option value="WATCH">Watch (60–79)</option>
              <option value="HEALTHY">Healthy (≥80)</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort store directory"
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            >
              <option value="srs_asc">SRS: Lowest First</option>
              <option value="srs_desc">SRS: Highest First</option>
              <option value="cancels_desc">Most Cancellations</option>
            </select>
          </div>
        </div>

        {/* Store Table */}
        {loading ? (
          <div className="py-12 text-center text-zinc-500 animate-pulse font-medium text-xs">
            Filtering stores and calculating Reliability Scores...
          </div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No stores matched the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Store Reliability Score directory">
              <caption className="sr-only">
                Directory of 620 store partners ranked by reliability score and cancellation risk
              </caption>
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  <th scope="col" className="py-3 px-3">Store</th>
                  <th scope="col" className="py-3 px-3">City / Category</th>
                  <th scope="col" className="py-3 px-3">Reliability (SRS)</th>
                  <th scope="col" className="py-3 px-3">Risk Breakdown</th>
                  <th scope="col" className="py-3 px-3">Last Confirmed</th>
                  <th scope="col" className="py-3 px-3">30d Orders / Cancels</th>
                  <th scope="col" className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {stores.map((s) => (
                  <tr key={s.store_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-zinc-950 dark:text-white">
                      {s.name}
                      <span className="block text-[11px] font-mono text-zinc-400 font-normal">{s.store_id}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{s.city}</span>
                      <span className="block text-xs text-zinc-400 capitalize">{s.category}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-xs border ${getBandBadge(s.band)}`}>
                          {s.srs} • {s.band}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-zinc-500">
                      <div>Stale: {s.components.r_stale}</div>
                      <div>Unavail: {s.components.r_unavail} | Rej: {s.components.r_reject}</div>
                    </td>
                    <td className="py-3 px-3 text-xs text-zinc-600 dark:text-zinc-300 font-mono">
                      {s.last_confirmed_hours_ago}h ago
                    </td>
                    <td className="py-3 px-3 text-xs font-mono">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{s.orders_30d}</span> orders
                      <span className="block text-zinc-500 font-medium">{s.cancels_30d} cancels</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/store/${s.store_id}`}
                        className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Nudges &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
