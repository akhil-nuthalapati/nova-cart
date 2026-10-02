import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Demo database seeding', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not write the database when the seed module is imported', async () => {
    await import('../../scripts/seed');

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('produces identical data on repeated explicit resets', async () => {
    const { seedDatabase } = await import('../../scripts/seed');

    seedDatabase();
    seedDatabase();

    const writes = vi.mocked(fs.writeFileSync).mock.calls;
    expect(writes).toHaveLength(2);
    expect(writes[0][0]).toBe(path.join(process.cwd(), 'public', 'demo-db.json'));
    expect(writes[0][1]).toBe(writes[1][1]);
    const database = JSON.parse(writes[0][1] as string);
    expect(database.stores).toHaveLength(620);
    expect(database.orders).toHaveLength(38500);
  });

  it('does not seed on import or request when reset is disabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { POST } = await import('../../src/app/api/dev/reset-seed/route');

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    const response = await POST();

    expect(response.status).toBe(404);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('preserves explicit development reset requests', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { POST } = await import('../../src/app/api/dev/reset-seed/route');

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    const response = await POST();

    expect(response.status).toBe(200);
    expect(fs.writeFileSync).toHaveBeenCalledOnce();
  });
});
