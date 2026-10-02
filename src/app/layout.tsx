import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nova Cart — Quality-of-Growth Control Tower & Spend Gate',
  description: 'Enterprise Availability Guard & Spend Gate Operations Platform for Nova Cart. Decouple growth from operational leaks.',
  keywords: ['quick-commerce', 'control tower', 'spend gate', 'operations', 'unit economics', 'reliability score'],
  openGraph: {
    title: 'Nova Cart — Quality-of-Growth Control Tower',
    description: 'Enterprise Availability Guard & Spend Gate Operations Platform for Nova Cart.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">
        {/* Accessibility Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-black focus:text-white dark:focus:bg-white dark:focus:text-black focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-zinc-500 text-xs font-bold"
        >
          Skip to main content
        </a>

        {/* Mandatory ASM-006 Synthetic Demo Data Banner */}
        <div className="bg-zinc-950 text-zinc-300 border-b border-zinc-800 text-xs px-4 py-1.5 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span>
              <strong className="text-white">SYNTHETIC DEMO DATA</strong> — Calibrated to MET-001..010 & GOLD-01..10 benchmarks (ASM-006). All local store metrics are synthetic.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-400">
            <span>Budget Cap: ₹25L (MET-023)</span>
            <span>•</span>
            <span>3 Cities / 620 Stores</span>
          </div>
        </div>

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
                  NC
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight text-black dark:text-white">
                    NOVA CART
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold -mt-1">
                    Control Tower
                  </span>
                </div>
              </Link>

              <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 text-sm font-medium">
                <Link
                  href="/executive"
                  className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Executive (SCR-01)
                </Link>
                <Link
                  href="/control-tower"
                  className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Control Tower (SCR-02)
                </Link>
                <Link
                  href="/store/store-1"
                  className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Store Portal (SCR-03)
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-full text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
                <span>Role:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">Partner Manager</span>
              </div>
              <Link
                href="/control-tower"
                className="text-xs px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black font-semibold rounded-lg shadow-sm transition-all active:scale-95"
              >
                Ops Dashboard &rarr;
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 focus:outline-none">{children}</main>

        {/* Global Footer */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>NOVA CART Quality-of-Growth Control Tower • Built for Business Rescue Challenge</div>
            <div className="flex items-center gap-4 text-zinc-400">
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
