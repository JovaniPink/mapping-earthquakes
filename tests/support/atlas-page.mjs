import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const liveFeedUrl =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
const basemapStyleUrl = 'https://tiles.openfreemap.org/styles/fiord';
const liveFixture = await readFile(
  new URL('../fixtures/usgs-month.geojson', import.meta.url),
  'utf8'
);
const emptyBasemapStyle = JSON.stringify({
  version: 8,
  name: 'Offline browser-test style',
  sources: {},
  layers: [],
});

export async function openAtlas(page, { liveFeed = 'fixture' } = {}) {
  const pageErrors = [];
  const externalRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (requestUrl.origin === 'http://127.0.0.1:4173') {
      await route.continue();
      return;
    }

    if (requestUrl.href === liveFeedUrl) {
      if (liveFeed === 'fixture') {
        await route.fulfill({
          status: 200,
          contentType: 'application/geo+json',
          body: liveFixture,
        });
      } else {
        await route.abort('failed');
      }
      return;
    }

    if (requestUrl.href === basemapStyleUrl) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: emptyBasemapStyle,
      });
      return;
    }

    if (['http:', 'https:'].includes(requestUrl.protocol)) {
      externalRequests.push(requestUrl.href);
    }
    await route.abort('blockedbyclient');
  });

  await page.goto('/');
  await expect(page.locator('#feed-label')).not.toHaveText(
    'Connecting to USGS'
  );
  await page.waitForLoadState('networkidle');

  return {
    assertClean() {
      expect(externalRequests, 'unexpected external browser requests').toEqual(
        []
      );
      expect(pageErrors, 'uncaught browser errors').toEqual([]);
    },
  };
}
