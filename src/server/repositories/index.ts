/**
 * Repository barrel export.
 * All data access goes through these modules — never raw SQL or direct file reads in routes.
 * Supports dual-mode (Supabase PostgreSQL in production, cached JSON in static/demo).
 */

export * as metricsRepo from './metrics.repo';
export * as ordersRepo from './orders.repo';
export * as storesRepo from './stores.repo';
export * as inventoryRepo from './inventory.repo';
export * as ticketsRepo from './tickets.repo';
