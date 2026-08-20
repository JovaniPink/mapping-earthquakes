import { expect, test } from '@playwright/test';

import { openAtlas } from '../support/atlas-page.mjs';

test('selecting a fixture event opens its observed-event detail', async ({
  page,
}) => {
  const browser = await openAtlas(page);

  await page
    .locator('#event-list button', { hasText: 'Browser Fixture Ridge' })
    .click();

  const detail = page.locator('#event-detail');
  await expect(detail).toBeVisible();
  await expect(detail.getByText('USGS observed event')).toBeVisible();
  await expect(page.locator('#event-detail-title')).toHaveText(
    'Browser Fixture Ridge'
  );
  await expect(page.locator('#detail-magnitude')).toHaveText('M6.4');
  await expect(page.locator('#detail-depth')).toHaveText('18.4 km');
  await expect(page.locator('#detail-source')).toHaveAttribute(
    'href',
    'https://earthquake.usgs.gov/earthquakes/eventpage/test-fixture-ridge'
  );
  browser.assertClean();
});

test('refreshing an open event replaces stale details for the same USGS id', async ({
  page,
}) => {
  const browser = await openAtlas(page, {
    liveFeed: 'revised-on-refresh',
  });

  await page
    .locator('#event-list button', { hasText: 'Browser Fixture Ridge' })
    .click();
  await expect(page.locator('#event-detail-title')).toHaveText(
    'Browser Fixture Ridge'
  );

  await page.locator('#refresh-data').click();

  await expect(page.locator('#event-detail-title')).toHaveText(
    'Revised Browser Fixture Ridge'
  );
  await expect(page.locator('#detail-magnitude')).toHaveText('M6.7');
  await expect(page.locator('#detail-felt')).toHaveText('84');
  expect(browser.liveRequestCount).toBe(2);
  browser.assertClean();
});

test('a filter with no matching observations renders an explicit empty state', async ({
  page,
}) => {
  const browser = await openAtlas(page);

  await page.locator('#place-search').fill('No fixture has this place');

  await expect(page.locator('#result-count')).toHaveText('0 results');
  await expect(page.locator('#summary-count')).toHaveText('0');
  await expect(page.locator('#event-list')).toHaveText(
    'No observed events match this exact window.'
  );
  await expect(page.locator('#focus-strongest')).toBeDisabled();
  browser.assertClean();
});

test('the timeline scrubber responds to keyboard navigation', async ({
  page,
}) => {
  const browser = await openAtlas(page);
  const scrubber = page.locator('#timeline-scrubber');

  await expect(scrubber).toBeEnabled();
  await expect(scrubber).toHaveValue('29');
  await scrubber.focus();
  await scrubber.press('Home');

  await expect(scrubber).toHaveValue('0');
  await expect(page.locator('#timeline-date')).toHaveText('Fri, Jul 17, 2026');
  await expect(page.locator('#event-list')).toContainText(
    'Keyboard Fixture Coast'
  );

  await scrubber.press('ArrowRight');
  await expect(scrubber).toHaveValue('1');
  await expect(page.locator('#timeline-date')).toHaveText('Sat, Jul 18, 2026');
  browser.assertClean();
});

test('a failed live request exposes the committed fallback as fallback mode', async ({
  page,
}) => {
  const browser = await openAtlas(page, { liveFeed: 'unavailable' });

  await expect(page.locator('#feed-state')).toHaveAttribute(
    'data-tone',
    'fallback'
  );
  await expect(page.locator('#feed-label')).toHaveText('Fallback snapshot');
  await expect(page.locator('#feed-detail')).toContainText(
    'Significant events only · retrieved'
  );
  await expect(page.locator('#panel-notice')).toHaveText(
    'The live monthly feed is unavailable. The map is showing a narrower, committed snapshot of significant events only.'
  );
  await expect(page.locator('.source-dock')).toContainText('Observed data');
  browser.assertClean();
});
