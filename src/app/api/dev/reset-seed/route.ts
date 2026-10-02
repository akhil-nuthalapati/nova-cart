import { NextResponse } from 'next/server';
import { seedDatabase } from '../../../../../scripts/seed';

/**
 * API-09: POST /api/dev/reset-seed
 * Roles: dev only
 * Re-seeds the demo database deterministically. Disabled in production.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Seed reset endpoint is disabled in production.' } },
      { status: 404 }
    );
  }

  try {
    seedDatabase();
    return NextResponse.json({
      success: true,
      message: 'Demo database reseeded successfully with canonical values.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: err.message || 'Failed to reseed database' } },
      { status: 500 }
    );
  }
}
