import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { atlasTestOrigin } from './test-server.mjs';

const liveFeedUrl =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
const basemapStyleUrl = 'https://tiles.openfreemap.org/styles/fiord';
const liveFixture = await readFile(
  new URL('../fixtures/usgs-month.geojson', import.meta.url),
  'utf8'
);
const revisedFixturePayload = JSON.parse(liveFixture);
const revisedEvent = revisedFixturePayload.features.find(
  ({ id }) => id === 'test-fixture-ridge'
);
revisedFixturePayload.metadata.generated += 60_000;
revisedEvent.properties.mag = 6.7;
revisedEvent.properties.place = 'Revised Browser Fixture Ridge';
revisedEvent.properties.updated += 60_000;
revisedEvent.properties.felt = 84;
revisedEvent.properties.title = 'M 6.7 - Revised Browser Fixture Ridge';
const revisedFixture = JSON.stringify(revisedFixturePayload);
const emptyBasemapStyle = JSON.stringify({
  version: 8,
  name: 'Offline browser-test style',
  sources: {},
  layers: [],
});

export async function openAtlas(page, { liveFeed = 'fixture' } = {}) {
  const pageErrors = [];
  const externalRequests = [];
  let liveRequestCount = 0;
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (requestUrl.origin === atlasTestOrigin) {
      await route.continue();
      return;
    }

    if (requestUrl.href === liveFeedUrl) {
      if (liveFeed === 'fixture' || liveFeed === 'revised-on-refresh') {
        const body =
          liveFeed === 'revised-on-refresh' && liveRequestCount > 0
            ? revisedFixture
            : liveFixture;
        liveRequestCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/geo+json',
          body,
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
  await expect(page.locator('#earthquake-map')).toHaveAttribute(
    'data-ready',
    'true'
  );

  return {
    get liveRequestCount() {
      return liveRequestCount;
    },
    assertClean() {
      expect(externalRequests, 'unexpected external browser requests').toEqual(
        []
      );
      expect(pageErrors, 'uncaught browser errors').toEqual([]);
    },
  };
}
