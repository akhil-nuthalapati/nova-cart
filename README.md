# NOVA CART — Quality-of-Growth Control Tower & Availability Guard

> **Business Rescue System for Nova Cart**  
> Addressing the core business question: *"Is NOVA CART getting better, or just bigger?"*  
> Strategy: **Fix the leak (53% inventory-side cancellations) before pouring in more water (+30% marketing spend).**

---

## 🎯 Executive Overview & Evidence Chain

NOVA CART has expanded to 620 stores across 3 Indian cities, reaching 120,000 registered users (+46.3%) and ₹26.1L monthly revenue (+19.7%). However, growth quality has critically deteriorated:
- **Order Cancellation Rate:** Doubled from 6% to **11%** (4,235 cancelled orders/mo).
- **Inventory-Side Leak:** **53% of all cancellations** (2,245 orders, ~5.8% of platform volume) stem from local inventory failures:
  - 35% unavailable after ordering (1,482 orders)
  - 18% store-rejected when busy (762 orders)
- **Repeat Purchase Rate:** Collapsed from 41% to **27%** (-14 pp).
- **Promo Inefficiency:** Promo spend surged +78.9% (₹17L/mo) to yield only +19.7% revenue (DER-003: only ₹0.57 incremental revenue per ₹1 promo).
- **Partner Store Strain:** 39% of store partners cite inventory upkeep as too effortful; 18% consider leaving.

---

## 🏗️ Architecture & System Principles

- **Zero-I/O Pure Domain Core (`src/domain/`):** Business rules (`BUS-001` through `BUS-014`) are pure TypeScript functions. No database, framework, or network coupling.
- **Contract-First API Architecture:** All routes (`/api/**`) validate request/response contracts using Zod.
- **Deterministic & Honest Disclosures:**
  - **LIM-1:** Retention correlations are stated as plausible, not causal.
  - **LIM-2:** Delivery delay (29→37 min) is explicitly marked out-of-scope for v1.
  - **LIM-3:** Direct recovered revenue is small; true value lies in retention, support savings, and partner stability (clearly surfaced as `UNKNOWN` lines).
- **Budget Guard (`BUS-012`):** Enforces compliance with the **₹25 Lakh** implementation budget cap (`MET-023`).

---

## 📱 Three Integrated User Portals

1. **SCR-01: Executive Dashboard (`/executive`)**
   - Quality-of-Growth Verdict banner (`GROWTH_WITH_QUALITY_DECLINE`, 5/5 guardrails worse).
   - Paired Top-Line Output metrics vs Operational Quality guardrails.
   - **Marketing Spend Gate (`BUS-010`):** Evaluates management's proposed +30% acquisition spend and recommends `HOLD_INCREMENTAL_ACQUISITION`.
   - Canonical 6-point Evidence Chain with source citations (`S1 §1–§8`).

2. **SCR-02: Availability Control Tower (`/control-tower`)**
   - Root-cause cancellation decomposition bar (inventory-side vs delivery-side).
   - Interactive 620-Store Reliability Directory with filtering (City, Category, SRS Band).
   - **Avoidable Cancellation Impact Simulator (`BUS-009`):** Interactive slider (0–100%) and presets (10%, 25%, 50%), calculating recovered orders, GMV, direct revenue, and avoided support tickets.
   - Priority Store Interventions list with Budget Guard monitoring.

3. **SCR-03: Store Partner Portal (`/store/[store_id]`)**
   - Mobile-first stock confirmation interface with thumb-friendly controls (≥48px height).
   - Priority ranked items based on demand and staleness (`demand_score × staleness_ratio`).
   - One-tap instant In Stock / Out of Stock verification with optimistic UI updates and live SRS lift animations.

---

## 🧪 Verification & Golden Test Benchmarks

Run the complete test suite:
```bash
npm test
```

All 9 test suites and 17 test cases pass:
- `GOLD-01`: Cancellation decomposition (38,500 orders, 11% cancel → 2,244 inventory cancels).
- `GOLD-02`: Promo ÷ Revenue (43.6% → 65.1%).
- `GOLD-03`: Revenue per order (₹67.79).
- `GOLD-04`: 25% cancellation reduction scenario (561 recovered orders, ₹2.73L GMV, 280 tickets).
- `GOLD-05`: Quality-of-growth verdict (`GROWTH_WITH_QUALITY_DECLINE`, 5/5 worse).
- `GOLD-06`: Stock staleness boundaries (24h Fresh, 72h Stale, >72h Critical).
- `GOLD-07` & `GOLD-08`: SRS scoring and band thresholds (≥80 Healthy, 60–79 Watch, <60 At Risk).
- `BUS-010`: Spend Gate decision without causal wording.
- `BUS-012`: Budget Guard with ₹25L cap and DER-009 conflict alert.
- `BUS-013`: Confidence level classification (`HIGH`, `MEDIUM`, `LOW`).

Build the production application:
```bash
npm run build
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.
- Home: [http://localhost:3000](http://localhost:3000)
- Executive View: [http://localhost:3000/executive](http://localhost:3000/executive)
- Availability Control Tower: [http://localhost:3000/control-tower](http://localhost:3000/control-tower)
- Store Partner Portal: [http://localhost:3000/store/store-1](http://localhost:3000/store/store-1)

---

## 📡 API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/growth/verdict` | GET | `BUS-001` Verdict and metric rows |
| `/api/cancellations/breakdown` | GET | `BUS-002` Cancellation reason decomposition |
| `/api/stores/reliability` | GET | `BUS-003/004` 620-Store Reliability scores |
| `/api/stores/[store_id]/nudges` | GET | `BUS-007` Ranked item nudges |
| `/api/stores/[store_id]/stock-confirmations` | POST | `API-05` Stock confirmation & SRS lift |
| `/api/scenarios/impact` | POST | `BUS-009` Impact scenario simulator |
| `/api/interventions` | GET | `BUS-008/012` Ops interventions & budget guard |
| `/api/availability/confidence` | GET | `BUS-005/006` Item confidence & substitutes |
| `/api/dev/reset-seed` | POST | Re-seed demo database (non-prod only) |
| `/api/health` | GET | Health check status |

### Stock confirmation storage

For Supabase deployments, apply `supabase/migrations/00003_atomic_stock_confirmations.sql`
**before** deploying this application version. The server now calls `confirm_stock_batch`
so the complete request, audit records, and inventory updates commit in one transaction.
Only the service role may execute this function. An identical retry returns the saved
batch result; reusing a store's request key for a different payload returns HTTP 409.

Demo mode retains each item's stock flag and confirmation timestamp in process memory.
Confirming one item does not refresh the rest of the store. Demo state and replay records
reset together on reseeding or process restart; demo mode is not durable multi-worker storage.
Reliability scores use average item age, including a conservative 72-hour contribution
for never-confirmed items. A store without inventory also receives maximum staleness risk.

Database regression checks are in `tests/sql/stock-confirmations.sql`. Against a
**disposable local database** with the migrations applied, run:

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/stock-confirmations.sql
```

The SQL suite uses transaction-scoped fixtures and rolls them back. It checks failure
rollback, retries, replay conflicts, per-store key isolation, and freshness calculations.
