import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-semibold uppercase tracking-wider">
          <span>Enterprise Decision Engine</span>
          <span>•</span>
          <span>DEC-001 Confirmed</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-950 dark:text-white">
          Quality-of-Growth <br />
          <span className="text-zinc-500 dark:text-zinc-400">
            Control Tower & Spend Gate
          </span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
          &ldquo;Is NOVA CART getting better, or just bigger?&rdquo; We fix the local inventory leak (53% of cancellations) before committing incremental acquisition spend.
        </p>
      </div>

      {/* 3 Core Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Executive Dashboard */}
        <Link
          href="/executive"
          className="group relative block p-7 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-black dark:hover:border-white transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center text-lg font-bold mb-5">
              01
            </div>
            <div className="text-xs uppercase font-bold tracking-wider text-zinc-500 mb-1">SCR-01 • Executive</div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">
              Growth Quality & Spend Gate
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Compares 4 top-line growth metrics against 5 operational guardrails. Evaluates the proposed +30% marketing spend increase.
            </p>
          </div>
          <div className="pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-950 dark:text-white group-hover:translate-x-0.5 transition-transform">
            <span>Executive Verdict</span>
            <span>&rarr;</span>
          </div>
        </Link>

        {/* Card 2: Availability Control Tower */}
        <Link
          href="/control-tower"
          className="group relative block p-7 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-black dark:hover:border-white transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center text-lg font-bold mb-5">
              02
            </div>
            <div className="text-xs uppercase font-bold tracking-wider text-zinc-500 mb-1">SCR-02 • Operations</div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">
              Availability Control Tower
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Decomposes 4,235 monthly cancellations, ranks 620 stores by Reliability Score, and simulates avoidable cancellation scenarios.
            </p>
          </div>
          <div className="pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-950 dark:text-white group-hover:translate-x-0.5 transition-transform">
            <span>Launch Ops Tower</span>
            <span>&rarr;</span>
          </div>
        </Link>

        {/* Card 3: Store Partner Portal */}
        <Link
          href="/store/store-1"
          className="group relative block p-7 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-black dark:hover:border-white transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center text-lg font-bold mb-5">
              03
            </div>
            <div className="text-xs uppercase font-bold tracking-wider text-zinc-500 mb-1">SCR-03 • Store Partner</div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">
              Store Nudges & Confirmation
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Mobile-first one-tap stock confirmation. Eliminates partner friction and lifts Store Reliability Scores systematically.
            </p>
          </div>
          <div className="pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-950 dark:text-white group-hover:translate-x-0.5 transition-transform">
            <span>Test Demo Store 1</span>
            <span>&rarr;</span>
          </div>
        </Link>
      </div>

      {/* Architecture & Business Rescue Pillars */}
      <div className="p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-6">
        <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
          <span>System Architecture & Verification Chain</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="font-semibold text-zinc-950 dark:text-white block mb-1">Pure Domain Logic</span>
            <p className="text-xs text-zinc-500">
              Rules BUS-001 through BUS-014 are implemented as pure mathematical functions with 100% test coverage.
            </p>
          </div>
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="font-semibold text-zinc-950 dark:text-white block mb-1">Deterministic Outputs</span>
            <p className="text-xs text-zinc-500">
              Deterministic calculations across all business metrics. All analysis and verdicts are templated from verified data.
            </p>
          </div>
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="font-semibold text-zinc-950 dark:text-white block mb-1">Honest Disclosures</span>
            <p className="text-xs text-zinc-500">
              Strictly adheres to LIM-1, LIM-2, and LIM-3: explicitly surfaces unknown retention, support, and partner churn impacts.
            </p>
          </div>
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="font-semibold text-zinc-950 dark:text-white block mb-1">Budget Protected</span>
            <p className="text-xs text-zinc-500">
              BUS-012 Budget Guard guarantees all interventions comply with the ₹25L implementation budget cap (MET-023).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
