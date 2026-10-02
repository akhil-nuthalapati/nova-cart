'use client';

import { useEffect, useState } from 'react';
import { Verdict } from '../../domain/types';
import type { VerdictResult, SpendGateResult } from '../../domain/types';
import Link from 'next/link';

export default function ExecutiveDashboard() {
  const [verdictData, setVerdictData] = useState<VerdictResult | null>(null);
  const [gateData, setGateData] = useState<SpendGateResult | null>(null);
  const [proposedSpend, setProposedSpend] = useState<number>(510000); // Canonical ₹5.1L (+30% marketing)
  const [loading, setLoading] = useState(true);
  const [showEvidence, setShowEvidence] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/growth').then((res) => res.json()),
      fetch('/api/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_increase: 510000 }),
      }).then((res) => res.json()),
    ])
      .then(([growthData, initialGateData]) => {
        setVerdictData(growthData);
        setGateData(initialGateData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load growth data:', err);
        setLoading(false);
      });
  }, []);

  const handleGateCheck = async () => {
    try {
      const res = await fetch('/api/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_increase: proposedSpend }),
      });
      const data = await res.json();
      setGateData(data);
    } catch (err) {
      console.error('Gate check failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-medium text-sm">Evaluating Quality-of-Growth Core Benchmarks...</p>
      </div>
    );
  }

  if (!verdictData) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <div className="p-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100">
          <h2 className="text-lg font-bold mb-2">Data Quality Block</h2>
          <p className="text-sm text-zinc-500">Unable to retrieve baseline and current metric snapshots.</p>
        </div>
      </div>
    );
  }

  const isDecline = verdictData.verdict === Verdict.GROWTH_WITH_QUALITY_DECLINE;

  const formatMetricValue = (val: number, unit: string) => {
    if (unit === '₹/mo') {
      return `₹${(val / 100000).toFixed(1)}L`;
    }
    if (unit === '%') {
      return `${(val * 100).toFixed(1)}%`;
    }
    if (unit === 'tickets/order') {
      return `${(val * 100).toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  const formatDelta = (delta: number, unit: string) => {
    const sign = delta > 0 ? '+' : '';
    if (unit === '₹/mo') {
      return `${sign}₹${(delta / 100000).toFixed(1)}L`;
    }
    if (unit === '%') {
      return `${sign}${(delta * 100).toFixed(1)} pp`;
    }
    if (unit === 'tickets/order') {
      return `${sign}${(delta * 100).toFixed(1)} pp`;
    }
    if (unit === 'min') {
      return `${sign}${delta} min`;
    }
    return `${sign}${delta.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
              SCR-01 • Executive View
            </span>
            <span className="text-xs text-zinc-500">Roles: CEO, CFO, Partner Manager</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
            Quality-of-Growth Control Tower
          </h1>
          <p className="text-zinc-500 mt-1 max-w-2xl text-sm">
            Core question: <span className="italic font-semibold text-zinc-900 dark:text-zinc-100">&quot;Is NOVA CART getting better, or just bigger?&quot;</span> Evaluates growth metrics against operational quality guardrails.
          </p>
        </div>

        {/* Verdict Badge */}
        <div className="flex flex-col items-start md:items-end">
          <div
            className={`px-4 py-2.5 rounded-xl border font-bold text-sm sm:text-base flex items-center gap-2.5 ${
              isDecline
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm'
                : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isDecline ? 'bg-white dark:bg-black animate-pulse' : 'bg-zinc-900 dark:bg-white'}`}></span>
            <span>VERDICT: {verdictData.verdict.replace(/_/g, ' ')}</span>
          </div>
          <span className="text-xs text-zinc-500 mt-1 font-medium">
            Rule BUS-001 • {verdictData.worse_count} of 5 guardrails worse than baseline
          </span>
        </div>
      </div>

      {/* Metric Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Metrics */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-base font-bold flex items-center gap-2 text-zinc-950 dark:text-white">
              <span className="w-1.5 h-4 bg-zinc-900 dark:bg-white rounded-full inline-block"></span>
              Top-Line Growth Metrics (Output)
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
              All 4 Growing
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {verdictData.growth_metrics.map((m) => (
              <div key={m.id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{m.name}</div>
                  <div className="text-xs text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>{m.id}</span>
                    <span>•</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {m.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-base text-zinc-950 dark:text-white">
                    {formatMetricValue(m.current, m.unit)}
                  </div>
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-end gap-1">
                    <span>▲</span>
                    <span>{formatDelta(m.delta, m.unit)}</span>
                    <span className="text-zinc-500 font-normal">
                      (from {formatMetricValue(m.baseline, m.unit)})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Guardrails */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-base font-bold flex items-center gap-2 text-zinc-950 dark:text-white">
              <span className="w-1.5 h-4 bg-zinc-900 dark:bg-white rounded-full inline-block"></span>
              Operational Guardrails (Quality)
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-black">
              5 of 5 Declining
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {verdictData.guardrail_metrics.map((m) => (
              <div
                key={m.id}
                className={`py-3 flex justify-between items-center ${
                  m.worse ? 'bg-zinc-50 dark:bg-zinc-900/60 -mx-2 px-2 rounded-lg' : ''
                }`}
              >
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                    <span>{m.name}</span>
                    {m.worse && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded">
                        Defect
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>{m.id}</span>
                    <span>•</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {m.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-base text-zinc-950 dark:text-white">
                    {formatMetricValue(m.current, m.unit)}
                  </div>
                  <div className="text-xs font-semibold flex items-center justify-end gap-1 text-zinc-900 dark:text-zinc-100">
                    <span>{m.direction === 'up' ? '▲' : '▼'}</span>
                    <span>{formatDelta(m.delta, m.unit)}</span>
                    <span className="text-zinc-500 font-normal">
                      (from {formatMetricValue(m.baseline, m.unit)})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spend Gate Card (BUS-010) */}
      <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                BUS-010 • Decision Gate
              </span>
              <span className="text-xs text-zinc-500">Acquisition vs Operational Fixes</span>
            </div>
            <h2 className="text-2xl font-black text-zinc-950 dark:text-white mt-1">
              Marketing Spend Gate (P1)
            </h2>
            <p className="text-sm text-zinc-500">
              Evaluates management&apos;s proposed +30% incremental marketing spend (+₹5.1L/mo) against quality guardrails.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label htmlFor="proposed-spend" className="block text-xs font-semibold text-zinc-500 mb-1">
                Proposed Monthly Increase
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-400 font-semibold text-xs">₹</span>
                <input
                  id="proposed-spend"
                  type="number"
                  step="50000"
                  value={proposedSpend}
                  onChange={(e) => setProposedSpend(Number(e.target.value))}
                  aria-label="Proposed monthly marketing spend increase in rupees"
                  className="pl-7 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 font-mono font-semibold text-sm w-44 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleGateCheck}
              className="mt-5 px-4 py-2 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-lg font-semibold text-xs shadow-sm transition-all active:scale-95"
            >
              Evaluate Gate
            </button>
          </div>
        </div>

        {gateData && (
          <div className="p-6 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Recommended Decision</span>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
                  {gateData.decision.replace(/_/g, ' ')}
                </h3>
              </div>
              <div className="text-xs font-semibold bg-white dark:bg-zinc-950 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                Action: <span className="font-bold underline ml-1">{gateData.what_changes}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 text-sm">
              <div>
                <strong className="block text-zinc-400 text-xs uppercase mb-1">What is happening</strong>
                <p className="text-zinc-800 dark:text-zinc-200 text-xs">{gateData.what_happening}</p>
              </div>
              <div>
                <strong className="block text-zinc-400 text-xs uppercase mb-1">Why it matters (Evidence)</strong>
                <p className="text-zinc-800 dark:text-zinc-200 text-xs">{gateData.why_matters}</p>
              </div>
              <div>
                <strong className="block text-zinc-400 text-xs uppercase mb-1">Expected Upside</strong>
                <p className="text-zinc-800 dark:text-zinc-200 text-xs">{gateData.what_improves}</p>
              </div>
              <div>
                <strong className="block text-zinc-400 text-xs uppercase mb-1">Cost Impact</strong>
                <p className="text-zinc-800 dark:text-zinc-200 font-mono font-semibold text-xs">{gateData.cost}</p>
              </div>
              <div>
                <strong className="block text-zinc-400 text-xs uppercase mb-1">Potential Risk (Honest)</strong>
                <p className="text-zinc-800 dark:text-zinc-200 text-xs">{gateData.what_could_go_wrong}</p>
              </div>
              <div>
                <strong className="block text-zinc-400 text-xs uppercase mb-1">Measurement KPI</strong>
                <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-xs">{gateData.how_measured}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Chain Panel */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white"></span>
              Canonical Evidence Chain (02 §1)
            </h3>
            <p className="text-xs text-zinc-500">Every recommendation is directly tied to validated source evidence.</p>
          </div>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            aria-expanded={showEvidence}
            aria-controls="canonical-evidence-chain-grid"
            className="text-xs text-zinc-900 dark:text-zinc-100 hover:underline font-semibold"
          >
            {showEvidence ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {showEvidence && (
          <div id="canonical-evidence-chain-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {verdictData.evidence.map((ev, idx) => (
              <div
                key={idx}
                className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{ev.source_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {ev.label}
                  </span>
                </div>
                <div className="font-bold text-zinc-950 dark:text-white text-sm">{ev.metric}</div>
                <div className="text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                  {ev.value}
                </div>
                <div className="text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Implication: </span>
                  {ev.implication}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Step Action Box */}
      <div className="p-6 bg-zinc-950 text-white border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold">Investigate Operational Leak in Control Tower</h3>
          <p className="text-zinc-400 text-xs max-w-xl">
            Over 53% of cancellations stem from local inventory unavailability. Drill down into store reliability scores and simulate order recovery.
          </p>
        </div>
        <Link
          href="/control-tower"
          className="px-5 py-2.5 bg-white text-black hover:bg-zinc-100 font-bold rounded-lg shadow-sm transition-transform active:scale-95 whitespace-nowrap text-xs"
        >
          Open Availability Control Tower &rarr;
        </Link>
      </div>
    </div>
  );
}
