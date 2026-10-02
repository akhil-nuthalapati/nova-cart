import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nova Cart — Quality-of-Growth Control Tower',
  description: 'Availability Guard & Spend Gate Operations Platform for Nova Cart',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        {/* Mandatory ASM-006 Synthetic Demo Data Banner */}
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs px-4 py-1.5 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>
              <strong>SYNTHETIC DEMO DATA</strong> — Calibrated to MET-001..010 & GOLD-01..10 benchmarks (ASM-006). All local store metrics are synthetic.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] opacity-80">
            <span>Budget Cap: ₹25L (MET-023)</span>
            <span>•</span>
            <span>3 Cities / 620 Stores</span>
          </div>
        </div>

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md group-hover:scale-105 transition-transform">
                  NC
                </div>
                <div>
                  <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    NOVA CART
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-semibold -mt-1">
                    Control Tower
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                <Link
                  href="/executive"
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Executive (SCR-01)
                </Link>
                <Link
                  href="/control-tower"
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Control Tower (SCR-02)
                </Link>
                <Link
                  href="/store/store-1"
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Store Portal (SCR-03)
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active Role:</span>
                <span className="font-semibold text-slate-900 dark:text-white">Partner Manager</span>
              </div>
              <Link
                href="/control-tower"
                className="text-xs px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all active:scale-95"
              >
                Ops Dashboard &rarr;
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-600 dark:text-slate-300">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>NOVA CART Quality-of-Growth Control Tower • Built for Business Rescue Challenge</div>
            <div className="flex items-center gap-4">
              <span>DEC-001 Confirmed</span>
              <span>•</span>
              <span>Pure Domain Engine</span>
              <span>•</span>
              <span>LIM-1/2/3 Honest Disclosures</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
