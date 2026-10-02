import { NextResponse } from 'next/server';

/**
 * API-10: GET /api/health
 * Public health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nova-cart-control-tower',
    version: '1.0.0',
    synthetic: true,
  });
}
