'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface NudgeItem {
  item_id: string;
  item_name: string;
  demand_score: number;
  staleness_ratio: number;
  priority: number;
  reason: string;
  hours_since_confirmed: number;
}

interface StoreData {
  store_id: string;
  store_name: string;
  city: string;
  srs: number;
  band: 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'INSUFFICIENT_DATA';
  last_confirmed_hours_ago: number;
  nudges: NudgeItem[];
}

function generateConfirmationKey(storeId: string, itemId: string): string {
  return `conf-${storeId}-${itemId}-${Date.now()}`;
}

export default function StoreNudgePage({
  params,
}: {
  params: Promise<{ store_id: string }>;
}) {
  const { store_id } = use(params);

  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmedItemsCount, setConfirmedItemsCount] = useState(0);
  const [srsLift, setSrsLift] = useState<number | null>(null);
  const [submittingItem, setSubmittingItem] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stores/${store_id}/nudges`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setData(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load store nudges:', err);
        setLoading(false);
      });
  }, [store_id]);

  const handleStockAction = async (itemId: string, inStock: boolean) => {
    if (!data) return;

    setSubmittingItem(itemId);

    // Optimistic UI update: remove item from active nudges
    const itemToRemove = data.nudges.find((n) => n.item_id === itemId);
    const remainingNudges = data.nudges.filter((n) => n.item_id !== itemId);

    setData({
      ...data,
      nudges: remainingNudges,
    });
    setConfirmedItemsCount((prev) => prev + 1);

    try {
      const idempotencyKey = generateConfirmationKey(store_id, itemId);
      const res = await fetch(`/api/stores/${store_id}/stock-confirmations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ itemId, inStock }],
          idempotencyKey,
        }),
      });

      const result = await res.json();
      if (result.data) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                srs: result.data.after_srs,
                band: result.data.after_band,
              }
            : null
        );
        setSrsLift(result.data.srs_lift);
      }
    } catch (err) {
      console.error('Failed to submit confirmation:', err);
      // Rollback optimistic removal on network failure
      if (itemToRemove) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                nudges: [itemToRemove, ...prev.nudges],
              }
            : null
        );
        setConfirmedItemsCount((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setSubmittingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Loading priority store nudges...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-600">
          <h2 className="text-lg font-bold">Store Not Found</h2>
          <p className="text-sm mt-1">Unable to locate store with ID: {store_id}</p>
          <Link href="/control-tower" className="mt-4 inline-block text-xs font-bold text-blue-600 underline">
            Return to Control Tower
          </Link>
        </div>
      </div>
    );
  }

  const isHealthy = data.band === 'HEALTHY';
  const isAtRisk = data.band === 'AT_RISK';

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Mobile-Friendly Store Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SCR-03 • Store Owner Portal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">{data.store_name}</h1>
          <p className="text-xs text-slate-400 font-mono">
            {data.city} • Store ID: {data.store_id}
          </p>
        </div>

        {/* Reliability Score Card */}
        <div
          className={`p-3 sm:p-4 rounded-2xl text-center border-2 shadow-sm ${
            isHealthy
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : isAtRisk
              ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200'
              : 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Reliability Score
          </div>
          <div className="text-3xl font-black font-mono leading-none my-1">{data.srs}</div>
          <div className="text-[11px] font-bold">{data.band}</div>
          {srsLift !== null && srsLift > 0 && (
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-bounce mt-1">
              +{srsLift} pts lift!
            </div>
          )}
        </div>
      </div>

      {/* Action Purpose Explanation */}
      <div className="p-4 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <span className="text-xl">⚡</span>
        <div>
          <strong className="block font-bold">Quick One-Tap Stock Confirmation</strong>
          <span>
            Confirming these {data.nudges.length} high-demand items keeps your store active, avoids order cancellations, and elevates your Reliability Score.
          </span>
        </div>
      </div>

      {/* Nudge Items List or All-Caught-Up State */}
      {data.nudges.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-3xl bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">All caught up!</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            Your high-demand inventory is fully verified. Thank you for keeping your stock fresh!
          </p>
          {confirmedItemsCount > 0 && (
            <div className="inline-block px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-full font-bold text-xs">
              {confirmedItemsCount} item(s) confirmed this session
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>High-Demand Items ({data.nudges.length} pending)</span>
            <span>Tap to verify</span>
          </div>

          {data.nudges.map((nudge) => (
            <div
              key={nudge.item_id}
              className="p-4 sm:p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                    {nudge.item_name}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    High Demand
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <span>📊 {nudge.reason}</span>
                </p>
              </div>

              {/* Thumb-friendly action buttons (>= 44px height per accessibility & contract) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  disabled={submittingItem === nudge.item_id}
                  onClick={() => handleStockAction(nudge.item_id, false)}
                  className="min-h-[48px] py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  Out of Stock ✕
                </button>
                <button
                  disabled={submittingItem === nudge.item_id}
                  onClick={() => handleStockAction(nudge.item_id, true)}
                  className="min-h-[48px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>In Stock</span>
                  <span>✓</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <Link href="/control-tower" className="text-blue-600 hover:underline font-semibold">
          &larr; Back to Control Tower
        </Link>
        <span>Store Owner Session</span>
      </div>
    </div>
  );
}
