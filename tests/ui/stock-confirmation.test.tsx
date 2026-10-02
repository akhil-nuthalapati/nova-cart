// @vitest-environment jsdom

import { act, createElement, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StoreNudgePage from '../../src/app/store/[store_id]/page';

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn<typeof fetch>();

const store = {
  store_id: 'store-1', store_name: 'Test Store', city: 'City A',
  srs: 50, band: 'AT_RISK', last_confirmed_hours_ago: 48,
  nudges: [{
    item_id: 'milk', item_name: 'Milk', demand_score: 20,
    staleness_ratio: 1, priority: 20, reason: 'Needs confirmation', hours_since_confirmed: 48,
  }],
};

function success() {
  return Response.json({ data: { after_srs: 80, after_band: 'HEALTHY', srs_lift: 30 } });
}

async function confirm() {
  const button = Array.from(container.querySelectorAll('button'))
    .find((element) => element.textContent?.includes('In Stock'));
  expect(button).toBeDefined();
  await act(async () => { button!.click(); });
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValueOnce(Response.json({ data: store }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const params = Promise.resolve({ store_id: 'store-1' });
  await act(async () => {
    root.render(createElement(Suspense, { fallback: 'Loading' }, createElement(StoreNudgePage, { params })));
  });
  expect(container.textContent).toContain('Milk');
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Store stock confirmation', () => {
  it.each([
    ['HTTP 400', () => Promise.resolve(Response.json({ error: 'Invalid item' }, { status: 400 }))],
    ['HTTP 500', () => Promise.resolve(Response.json({ error: 'Save failed' }, { status: 500 }))],
    ['non-JSON HTTP 500', () => Promise.resolve(new Response('Unavailable', { status: 500 }))],
    ['network failure', () => Promise.reject(new Error('Offline'))],
    ['missing success data', () => Promise.resolve(Response.json({}))],
  ])('restores the item after %s and counts only the successful retry', async (_name, fail) => {
    fetchMock.mockImplementationOnce(fail);
    await confirm();
    expect(container.textContent).toContain('Milk');
    expect(container.textContent).not.toContain('All caught up!');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Please try again');
    expect(container.textContent).not.toContain('30 pts lift');

    fetchMock.mockResolvedValueOnce(success());
    await confirm();
    expect(container.textContent).toContain('All caught up!');
    expect(container.textContent).toContain('1 item(s) confirmed this session');
    expect(container.textContent).toContain('HEALTHY');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps a successful confirmation and updates the score', async () => {
    fetchMock.mockResolvedValueOnce(success());
    await confirm();
    expect(container.textContent).toContain('All caught up!');
    expect(container.textContent).toContain('1 item(s) confirmed this session');
    expect(container.textContent).toContain('+30 pts lift!');
    expect(container.textContent).toContain('HEALTHY');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
