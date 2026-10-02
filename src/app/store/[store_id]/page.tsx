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
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

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
    setConfirmationError(null);

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

      if (!res.ok) {
        throw new Error(`Stock confirmation failed (${res.status})`);
      }

      const result = await res.json();
      if (!result?.data) {
        throw new Error('Stock confirmation response is missing data');
      }
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
    } catch (err) {
      console.error('Failed to submit confirmation:', err);
      setConfirmationError('Could not confirm stock. Please try again.');
      // Roll back optimistic removal when the save cannot be confirmed.
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
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-medium text-xs">Loading priority store nudges...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="p-6 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100">
          <h2 className="text-base font-bold">Store Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1">Unable to locate store with ID: {store_id}</p>
          <Link href="/control-tower" className="mt-4 inline-block text-xs font-semibold text-black dark:text-white underline">
            Return to Control Tower
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Mobile-Friendly Store Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white"></span>
            <span>SCR-03 • Store Owner Portal</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white">{data.store_name}</h1>
          <p className="text-xs text-zinc-400 font-mono">
            {data.city} • Store ID: {data.store_id}
          </p>
        </div>

        {/* Reliability Score Card */}
        <div className="p-3 sm:p-4 rounded-xl text-center border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 shadow-sm min-w-28">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Reliability Score
          </div>
          <div className="text-2xl font-black font-mono leading-none my-1 text-zinc-950 dark:text-white">{data.srs}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 inline-block">
            {data.band}
          </div>
          {srsLift !== null && srsLift > 0 && (
            <div className="text-[10px] font-bold text-zinc-900 dark:text-white mt-1">
              +{srsLift} pts lift
            </div>
          )}
        </div>
      </div>

      {/* Action Purpose Explanation */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 flex items-start gap-3">
        <span className="text-base font-bold">⚡</span>
        <div>
          <strong className="block font-semibold">One-Tap Stock Confirmation</strong>
          <span className="text-zinc-500">
            Confirming these {data.nudges.length} high-demand items keeps your store active, avoids order cancellations, and elevates your Reliability Score.
          </span>
        </div>
      </div>

      {confirmationError && (
        <p role="alert" className="p-4 rounded-2xl border border-red-200 bg-red-50 text-sm text-red-700">
          {confirmationError}
        </p>
      )}

      {/* Nudge Items List or All-Caught-Up State */}
      {data.nudges.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
          <div className="text-3xl font-bold">✓</div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">All caught up!</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Your high-demand inventory is fully verified. Thank you for keeping your stock fresh.
          </p>
          {confirmedItemsCount > 0 && (
            <div className="inline-block px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full font-semibold text-xs">
              {confirmedItemsCount} item(s) confirmed this session
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium px-1">
            <span>High-Demand Items ({data.nudges.length} pending)</span>
            <span>Tap to verify</span>
          </div>

          {data.nudges.map((nudge) => (
            <div
              key={nudge.item_id}
              className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-zinc-950 dark:text-white text-base">
                    {nudge.item_name}
                  </h3>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                    High Demand
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  <span>{nudge.reason}</span>
                </p>
              </div>

              {/* Thumb-friendly action buttons (>= 44px height per accessibility & contract) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  disabled={submittingItem === nudge.item_id}
                  onClick={() => handleStockAction(nudge.item_id, false)}
                  className="min-h-[44px] py-2.5 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  Out of Stock ✕
                </button>
                <button
                  disabled={submittingItem === nudge.item_id}
                  onClick={() => handleStockAction(nudge.item_id, true)}
                  className="min-h-[44px] py-2.5 px-4 rounded-lg bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
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
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <Link href="/control-tower" className="text-zinc-950 dark:text-white hover:underline font-semibold">
          &larr; Back to Control Tower
        </Link>
        <span>Store Owner Session</span>
      </div>
    </div>
  );
}
