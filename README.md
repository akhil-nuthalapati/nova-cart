# 🛒 NOVA CART — Quality-of-Growth Control Tower & Spend Gate

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-78%2F78%20Passing-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Sub--2s%20Build-purple?style=flat)](https://turbo.build/)
[![WCAG](https://img.shields.io/badge/A11y-WCAG%202.1%20AA-success?style=flat)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Security](https://img.shields.io/badge/Security-HSTS%20%7C%20CSP%20%7C%20Idempotent-black?style=flat)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

> **Business Rescue Decision Engine for Quick-Commerce**  
> Resolving the executive question: *"Is NOVA CART getting better, or just bigger?"*  
> **Core Strategy:** Fix the local inventory leak (53% of cancellations) before burning capital on acquisition (+30% marketing spend).

---

## 📌 Executive Summary

NOVA CART scaled rapidly to **620 stores across 3 Indian cities**, reaching **120,000 registered users (+46%)** and **₹26.1L monthly revenue (+20%)**. However, top-line growth masked a severe operational collapse.

Management proposed an incremental **+30% marketing budget (+₹5.1L/month)**. The Control Tower evaluated operational guardrails against top-line outputs and issued a firm verdict:

```
⛔ VERDICT: HOLD_INCREMENTAL_ACQUISITION
Rationale: 4 of 4 output metrics are growing, but 5 of 5 operational guardrails are actively collapsing.
```

```
           THE "LEAKY BUCKET" ACQUISITION TRAP
   
   Proposed +₹5.1L Marketing ──► [ Acquire New Users ]
                                         │
                                         ▼
                               [ Place Grocery Order ]
                                         │
   ┌─────────────────────────────────────┴─────────────────────────────────────┐
   ▼                                                                           ▼
47% Fulfilled Orders                                               53% AVOIDABLE CANCELLATIONS
                                                                   • 35% Item Unavailable
                                                                   • 18% Store Busy / Rejected
                                                                               │
                                                                               ▼
                                                                     Customer Churns Forever
                                                                   (Repeat Rate collapsed to 27%)
```

---

## 📊 Core Business & Operational Benchmarks

### 1. Top-Line Growth vs. Operational Collapse
| Metric ID | Parameter | Baseline | Current | Delta | Direction | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `MET-001` | Registered Users | 82,000 | 120,000 | **+46.3%** | ▲ Up | Growth |
| `MET-002` | Monthly Active Users (MAU) | 39,000 | 46,000 | **+17.9%** | ▲ Up | Growth |
| `MET-003` | Monthly Order Volume | 31,200 | 38,500 | **+23.4%** | ▲ Up | Growth |
| `MET-010` | Platform Monthly Revenue | ₹21.8L | ₹26.1L | **+19.7%** | ▲ Up | Growth |
| `MET-005` | **Repeat Purchase Rate** | **41.0%** | **27.0%** | **-14.0 pp** | ▼ Down | 🚨 **Quality Defect** |
| `MET-007` | **Order Cancellation Rate** | **6.0%** | **11.0%** | **+5.0 pp** | ▲ Up | 🚨 **Quality Defect** |
| `MET-008` | **Support Ticket Volume** | **3,100** | **5,900** | **+90.3%** | ▲ Up | 🚨 **Cost Escalation** |
| `MET-006` | **Average Delivery Time** | **29 min** | **37 min** | **+8 min** | ▲ Up | 🚨 **Quality Defect** |
| `MET-009` | **Promo Spend / Revenue** | **43.6%** | **65.1%** | **+21.5 pp** | ▲ Up | 🚨 **Burn Escalation** |

### 2. Root Cause Cancellation Breakdown (`BUS-002`)
Out of **4,235 monthly cancellations** ($11\%$ of total volume):
* **35% Unavailable Item (1,482 orders)** — Customer ordered an item physically out-of-stock. *(Targeted)*
* **18% Store Rejected (763 orders)** — Store partner rejected the order due to peak rush. *(Targeted)*
* **27% Customer Delay (1,143 orders)** — Delivery partner delays. *(Disclosed Out of Scope v1)*
* **12% Partner Unavailable (508 orders)** — Rider fleet shortages. *(Disclosed Out of Scope v1)*
* **8% Other (339 orders)**.

> **Key Discovery:** **53% of cancellations (2,245 orders)** are directly solvable through proactive, low-friction store inventory confirmation.

---

## 📱 Three Integrated Workflows

```
  ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
  │   SCR-01: Executive    │      │ SCR-02: Control Tower  │      │  SCR-03: Store Portal  │
  │      (/executive)      │ ───► │    (/control-tower)    │ ───► │  (/store/[store_id])   │
  │                        │      │                        │      │                        │
  │ • Quality Verdict      │      │ • 4,235 Cancels Decomp │      │ • 1-Tap Stock Confirm  │
  │ • Marketing Spend Gate │      │ • 620-Store Directory  │      │ • Demand × Staleness   │
  │ • Evidence Citations   │      │ • Scenario Simulator   │      │ • Instant SRS Lift     │
  └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### 1. Executive Dashboard (`/executive`)
* **Spend Gate (`BUS-010`):** Evaluates any proposed marketing budget increase against operational guardrails.
* **Canonical Evidence Chain:** 6-point source citations linking metrics directly to verified root causes.
* **Objective Verdict:** Unambiguous `HOLD_INCREMENTAL_ACQUISITION` badge.

### 2. Operations Control Tower (`/control-tower`)
* **620-Store Directory:** Real-time Store Reliability Scores (SRS) with filters for City, Category, and Risk Band (`HEALTHY`, `WATCH`, `AT_RISK`).
* **Interactive Impact Simulator (`BUS-009`):** Drag-and-drop slider simulating business recovery:
  * At **25% cancellation reduction target (`GOLD-04`)**:
    * **+561** monthly orders recovered
    * **₹2.73 Lakh** GMV preserved
    * **280** support tickets avoided
* **Budget Guard (`BUS-012`):** Enforces compliance with the **₹25.0 Lakh** implementation cap (`MET-023`).

### 3. Store Partner Portal (`/store/[store_id]`)
* **Mobile-First Touch Target:** Thumb-friendly buttons ($\ge 44\text{px}$) designed for busy kirana store owners.
* **Ranked Nudge Engine (`BUS-007`):** Prioritizes items using $\text{Priority} = \text{Demand} \times \text{Staleness Ratio}$.
* **Optimistic UI with Rollback:** Instant visual feedback with automatic state rollback on network failures.

---

## 🏛️ System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │            Next.js 16 Presentation          │
                    │      React 19 Server & Client Components     │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │             API Route Handlers               │
                    │        Zod Schema Validation & Contracts     │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │           Pure Domain Engine (Core)          │
                    │        14 Mathematical Rules (BUS-001..14)   │
                    │        Zero Database / Framework Imports     │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │            Dual-Mode Repository Layer        │
                    │  ┌────────────────────┐ ┌──────────────────┐ │
                    │  │ Supabase / Postgres│ │ In-Memory Demo   │ │
                    │  │ (Production)       │ │ (Dev & Vitest)   │ │
                    │  └────────────────────┘ └──────────────────┘ │
                    └──────────────────────────────────────────────┘
```

* **Pure Domain Logic (`src/domain/`):** All business rules, formulas, and decisions are written as pure functions with 100% deterministic outputs.
* **Dual-Mode Persistence (`src/server/`):** Runs seamlessly against Supabase PostgreSQL in production, or instant in-memory seeded fixtures for local development and offline CI testing.
* **Concurrency Protection:** Client-generated idempotency keys guarantee that double-taps or flaky mobile connections never duplicate stock adjustments.

---

## 🛡️ Enterprise Security & Accessibility

* **Enterprise HTTP Security Headers:** Preloaded HSTS (2 years), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and restricted `Permissions-Policy`.
* **WCAG 2.1 AA Accessibility:** Keyboard-focusable skip-to-content bypass link (`#main-content`), high-contrast monochrome color palette, and `aria-live="polite"` dynamic screen reader announcements.
* **Honest Disclosures:** Adheres strictly to `LIM-1`, `LIM-2`, and `LIM-3` by displaying non-monetized outcomes as explicit `UNKNOWN` lines rather than fabricating revenue projections.

---

## ⚡ Verification & Quality Benchmarks

### Vitest Test Suite (65/65 Passing)
```bash
npm test
```
```text
 ✓ tests/domain/cancellation.test.ts (2 tests)
 ✓ tests/domain/budget.test.ts (2 tests)
 ✓ tests/domain/interventions.test.ts (1 test)
 ✓ tests/server/inventory-writes.test.ts (3 tests)
 ✓ tests/domain/scenario.test.ts (1 test)
 ✓ tests/domain/confidence.test.ts (1 test)
 ✓ tests/domain/reliability.test.ts (3 tests)
 ✓ tests/domain/verdict.test.ts (3 tests)
 ✓ tests/server/seed.test.ts (4 tests)
 ✓ tests/domain/availability.test.ts (3 tests)
 ✓ tests/domain/nudges.test.ts (1 test)
 ✓ tests/api/store-freshness.test.ts (4 tests)
 ✓ tests/api/scenario-impact.test.ts (4 tests)
 ✓ tests/server/demo-inventory.test.ts (4 tests)
 ✓ tests/server/repositories.test.ts (13 tests)
 ✓ tests/ui/stock-confirmation.test.tsx (6 tests)
 ✓ tests/api/api-boundaries.test.ts (13 tests)
 ✓ tests/api/stock-confirmations.test.ts (10 tests)

 Test Files  18 passed (18)
      Tests  78 passed (78)
```

### Production Build
```bash
npm run build
```
* Compiles 16 routes in **1.48 seconds** using Turbopack with zero warnings.

---

## 🚀 Quickstart Guide

### 1. Installation
```bash
git clone https://github.com/akhil-nuthalapati/nova-cart.git
cd nova-cart/nova-cart-app
npm install
```

### 2. Launch Local Environment
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Home:** `http://localhost:3000/`
* **Executive Spend Gate:** `http://localhost:3000/executive`
* **Availability Control Tower:** `http://localhost:3000/control-tower`
* **Store Partner Demo:** `http://localhost:3000/store/store-1`

---

## 📡 API Endpoints

| Route | Method | Specification | Purpose |
| :--- | :---: | :---: | :--- |
| `/api/growth/verdict` | `GET` | `BUS-001` | Executive growth vs. guardrail evaluation |
| `/api/growth` | `POST` | `BUS-010` | Spend Gate check for proposed marketing increases |
| `/api/cancellations/breakdown` | `GET` | `BUS-002` | Root-cause cancellation distribution |
| `/api/stores/reliability` | `GET` | `BUS-003, 004` | Filterable Store Reliability Directory (620 stores) |
| `/api/stores/[store_id]/nudges` | `GET` | `BUS-007` | Top priority items requiring partner verification |
| `/api/stores/[store_id]/stock-confirmations` | `POST` | `API-05` | Idempotent one-tap stock update & SRS lift |
| `/api/scenarios/impact` | `POST` | `BUS-009` | Real-time avoidable cancellation impact simulation |
| `/api/interventions` | `GET` | `BUS-008, 012`| High-risk store actions with ₹25L Budget Guard |
| `/api/health` | `GET` | `SYS-001` | System health check |

---

## 📄 License

Built for the **Nova Cart Business Rescue Challenge**. All rights reserved.
