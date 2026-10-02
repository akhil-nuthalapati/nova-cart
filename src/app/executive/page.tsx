'use client';

import { useEffect, useState } from 'react';
import { Verdict, SpendGateDecision } from '../../domain/types';
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
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Evaluating Quality-of-Growth Core Benchmarks...</p>
      </div>
    );
  }

  if (!verdictData) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-red-600">
          <h2 className="text-xl font-bold mb-2">Data Quality Block</h2>
          <p>Unable to retrieve baseline and current metric snapshots.</p>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              SCR-01 • Executive View
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">Roles: CEO, CFO, Partner Manager</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Quality-of-Growth Control Tower
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1 max-w-2xl text-sm">
            Core question: <span className="italic font-semibold text-slate-900 dark:text-slate-100">&quot;Is NOVA CART getting better, or just bigger?&quot;</span> Evaluates growth metrics against operational quality guardrails.
          </p>
        </div>

        {/* Verdict Badge */}
        <div className="flex flex-col items-start md:items-end">
          <div
            className={`px-5 py-3 rounded-2xl border-2 font-black text-base sm:text-lg shadow-sm flex items-center gap-3 ${
              isDecline
                ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full ${isDecline ? 'bg-red-600 animate-ping' : 'bg-emerald-600'}`}></span>
            <span>VERDICT: {verdictData.verdict.replace(/_/g, ' ')}</span>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Rule BUS-001 • {verdictData.worse_count} of 5 guardrails worse than baseline
          </span>
        </div>
      </div>

      {/* Metric Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Metrics */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
              Top-Line Growth Metrics (Output)
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              All 4 Growing
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {verdictData.growth_metrics.map((m) => (
              <div key={m.id} className="py-3.5 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{m.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono flex items-center gap-2">
                    <span>{m.id}</span>
                    <span>•</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                      {m.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-base text-slate-900 dark:text-white">
                    {formatMetricValue(m.current, m.unit)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 flex items-center justify-end gap-1">
                    <span>↑</span>
                    <span>{formatDelta(m.delta, m.unit)}</span>
                    <span className="text-slate-600 dark:text-slate-300 font-normal">
                      (from {formatMetricValue(m.baseline, m.unit)})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Guardrails */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="w-2.5 h-6 bg-red-500 rounded-full inline-block"></span>
              Operational Guardrails (Quality)
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              5 of 5 Declining
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {verdictData.guardrail_metrics.map((m) => (
              <div
                key={m.id}
                className={`py-3.5 flex justify-between items-center ${
                  m.worse ? 'bg-red-50/40 dark:bg-red-950/20 -mx-3 px-3 rounded-xl' : ''
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <span>{m.name}</span>
                    {m.worse && (
                      <span className="text-[10px] uppercase font-black px-1.5 py-0.5 bg-red-500 text-white rounded">
                        Defect
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono flex items-center gap-2">
                    <span>{m.id}</span>
                    <span>•</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                      {m.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-base text-slate-900 dark:text-white">
                    {formatMetricValue(m.current, m.unit)}
                  </div>
                  <div
                    className={`text-xs font-semibold flex items-center justify-end gap-1 ${
                      m.worse ? 'text-red-600' : 'text-slate-500'
                    }`}
                  >
                    <span>{m.direction === 'up' ? '↑' : '↓'}</span>
                    <span>{formatDelta(m.delta, m.unit)}</span>
                    <span className="text-slate-600 dark:text-slate-300 font-normal">
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
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-indigo-200 dark:border-indigo-900/60 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                BUS-010 • Decision Gate
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300">Acquisition vs Operational Fixes</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Marketing Spend Gate (P1)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Evaluates management&apos;s proposed +30% incremental marketing spend (+₹5.1L/mo) against quality guardrails.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Proposed Monthly Increase</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="50000"
                  value={proposedSpend}
                  onChange={(e) => setProposedSpend(Number(e.target.value))}
                  className="pl-7 pr-3 py-2 border rounded-xl bg-white dark:bg-slate-800 font-mono font-bold text-sm w-44 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleGateCheck}
              className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow transition-all active:scale-95"
            >
              Evaluate Gate
            </button>
          </div>
        </div>

        {gateData && (
          <div
            className={`p-6 rounded-2xl border-2 ${
              gateData.decision === SpendGateDecision.HOLD_INCREMENTAL_ACQUISITION
                ? 'bg-amber-500/10 border-amber-400 text-amber-950 dark:text-amber-100'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-300/40 dark:border-amber-700/40">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold">Recommended Decision</span>
                <h3 className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300">
                  {gateData.decision.replace(/_/g, ' ')}
                </h3>
              </div>
              <div className="text-sm font-semibold bg-white/80 dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800">
                Action: <span className="text-indigo-600 font-bold">{gateData.what_changes}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 text-sm">
              <div>
                <strong className="block text-slate-500 text-xs uppercase mb-1">What is happening</strong>
                <p className="text-slate-800 dark:text-slate-200">{gateData.what_happening}</p>
              </div>
              <div>
                <strong className="block text-slate-500 text-xs uppercase mb-1">Why it matters (Evidence)</strong>
                <p className="text-slate-800 dark:text-slate-200">{gateData.why_matters}</p>
              </div>
              <div>
                <strong className="block text-slate-500 text-xs uppercase mb-1">Expected Upside</strong>
                <p className="text-slate-800 dark:text-slate-200">{gateData.what_improves}</p>
              </div>
              <div>
                <strong className="block text-slate-500 text-xs uppercase mb-1">Cost Impact</strong>
                <p className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{gateData.cost}</p>
              </div>
              <div>
                <strong className="block text-slate-500 text-xs uppercase mb-1">Potential Risk (Honest)</strong>
                <p className="text-slate-800 dark:text-slate-200">{gateData.what_could_go_wrong}</p>
              </div>
              <div>
                <strong className="block text-slate-500 text-xs uppercase mb-1">Measurement KPI</strong>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{gateData.how_measured}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Chain Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Canonical Evidence Chain (02 §1)
            </h3>
            <p className="text-xs text-slate-500">Every recommendation is directly tied to validated source evidence.</p>
          </div>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            {showEvidence ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {showEvidence && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {verdictData.evidence.map((ev, idx) => (
              <div
                key={idx}
                className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-indigo-600">{ev.source_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {ev.label}
                  </span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{ev.metric}</div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                  {ev.value}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Implication: </span>
                  {ev.implication}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Step Action Box */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-xl font-bold">Investigate Operational Leak in Control Tower</h3>
          <p className="text-blue-100 text-sm max-w-xl">
            Over 53% of cancellations stem from local inventory unavailability. Drill down into store reliability scores and simulate order recovery.
          </p>
        </div>
        <Link
          href="/control-tower"
          className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap text-sm"
        >
          Open Availability Control Tower &rarr;
        </Link>
      </div>
    </div>
  );
}
