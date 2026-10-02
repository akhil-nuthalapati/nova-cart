import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          <span>Business Rescue System</span>
          <span>•</span>
          <span>Decision DEC-001</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
          Quality-of-Growth <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            Control Tower & Availability Guard
          </span>
        </h1>
        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
          &ldquo;Is NOVA CART getting better, or just bigger?&rdquo; We fix the local inventory leak (53% of cancellations) before pouring in +30% more acquisition spend.
        </p>
      </div>

      {/* 3 Core Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Executive Dashboard */}
        <Link
          href="/executive"
          className="group relative block p-8 bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-2xl hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-2xl font-black mb-5 group-hover:scale-110 transition-transform">
              📊
            </div>
            <div className="text-xs uppercase font-bold tracking-wider text-blue-600 mb-1">SCR-01 • Executive</div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
              Growth Quality & Spend Gate
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Compares 4 top-line growth metrics against 5 operational guardrails. Evaluates the proposed +30% marketing spend increase.
            </p>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-blue-600">
            <span>View Executive Verdict</span>
            <span>&rarr;</span>
          </div>
        </Link>

        {/* Card 2: Availability Control Tower */}
        <Link
          href="/control-tower"
          className="group relative block p-8 bg-white dark:bg-slate-800/80 rounded-3xl border-2 border-indigo-300 dark:border-indigo-800/80 shadow-md hover:shadow-2xl hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-2xl font-black mb-5 group-hover:scale-110 transition-transform">
              🛰️
            </div>
            <div className="text-xs uppercase font-bold tracking-wider text-indigo-600 mb-1">SCR-02 • Operations</div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
              Availability Control Tower
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Decomposes 4,235 monthly cancellations, ranks 620 stores by Reliability Score, and simulates avoidable cancellation scenarios.
            </p>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-indigo-600">
            <span>Launch Ops Tower</span>
            <span>&rarr;</span>
          </div>
        </Link>

        {/* Card 3: Store Partner Portal */}
        <Link
          href="/store/store-1"
          className="group relative block p-8 bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-2xl hover:border-emerald-500 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-2xl font-black mb-5 group-hover:scale-110 transition-transform">
              📱
            </div>
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-600 mb-1">SCR-03 • Store Partner</div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 transition-colors">
              Store Nudges & Confirmation
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Mobile-first one-tap stock confirmation. Eliminates partner fatigue (39% survey friction) and lifts Store Reliability Scores instantly.
            </p>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-emerald-600">
            <span>Test Demo Store 1</span>
            <span>&rarr;</span>
          </div>
        </Link>
      </div>

      {/* Architecture & Business Rescue Pillars */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>⚡</span> System Architecture & Core Evidence Chain
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div className="p-4 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">Pure Domain Logic</span>
            <p className="text-xs text-slate-500">
              Rules BUS-001 through BUS-014 are implemented as pure, zero-I/O mathematical functions with 100% test coverage.
            </p>
          </div>
          <div className="p-4 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">No AI Hallucinations</span>
            <p className="text-xs text-slate-500">
              Deterministic calculations across all business metrics. Any narrative explanation is templated from verified data.
            </p>
          </div>
          <div className="p-4 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">Honest Disclosures</span>
            <p className="text-xs text-slate-500">
              Strictly adheres to LIM-1, LIM-2, and LIM-3: explicitly surfaces unknown retention, support, and partner churn impacts.
            </p>
          </div>
          <div className="p-4 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">Budget Protected</span>
            <p className="text-xs text-slate-500">
              BUS-012 Budget Guard guarantees all interventions comply with the ₹25L implementation budget cap (MET-023).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
