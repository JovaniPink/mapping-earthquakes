import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DAY_MS,
  createDataSources,
  fetchFeatureCollection,
  findFeatureById,
  filterFeatures,
  getDepthBucket,
  getFeedStatus,
  getLegendEntries,
  getMagnitudeColor,
  getRefreshTimelineIndex,
  getTimelineBounds,
  isOfficialUsgsEventUrl,
  normalizeFeature,
  normalizeFeatureCollection,
  selectStrongest,
  summarizeFeatures,
  toFiniteNumber,
  validateFallbackReceipt,
} from '../static/js/earthquake-data.js';

const dataSources = createDataSources(
  new URL('../static/data/PB2002_boundaries.json', import.meta.url),
  new URL('../static/data/significant_month.geojson', import.meta.url),
  new URL('../static/data/significant_month.meta.json', import.meta.url)
);

function feature({
  id = 'event-1',
  mag = 4.2,
  place = 'Test Ridge',
  time = Date.UTC(2026, 7, 15),
  depth = 12,
  sig = 100,
  url = 'https://earthquake.usgs.gov/earthquakes/eventpage/us-test',
} = {}) {
  return normalizeFeature({
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [-117, 35, depth] },
    properties: { mag, place, time, sig, url, status: 'reviewed' },
  });
}

test('uses the official USGS past-month feed and bundled fallbacks', () => {
  assert.match(
    dataSources.liveEarthquakes,
    /^https:\/\/earthquake\.usgs\.gov\//
  );
  assert.match(dataSources.liveEarthquakes, /\/all_month\.geojson$/);
  assert.doesNotMatch(dataSources.fallbackSnapshot, /^https?:/);
  assert.match(dataSources.fallbackSnapshot, /significant_month\.geojson$/);
  assert.match(dataSources.fallbackMetadata, /significant_month\.meta\.json$/);
});

test('uses the repository-owned tectonic-plate snapshot', async () => {
  assert.doesNotMatch(dataSources.tectonicPlates, /^https?:/);
  const payload = JSON.parse(
    await readFile(new URL(dataSources.tectonicPlates), 'utf8')
  );
  assert.equal(payload.type, 'FeatureCollection');
  assert.equal(payload.features.length, 241);
});

test('pairs the fallback bytes with a complete, internally consistent receipt', async () => {
  const snapshotBytes = await readFile(
    new URL(dataSources.fallbackSnapshot),
    'utf8'
  );
  const snapshot = JSON.parse(snapshotBytes);
  const receipt = JSON.parse(
    await readFile(new URL(dataSources.fallbackMetadata), 'utf8')
  );

  assert.equal(receipt.source, 'USGS Earthquake Hazards Program');
  assert.match(receipt.sourceUrl, /^https:\/\/earthquake\.usgs\.gov\//);
  assert.match(receipt.coverage, /Significant earthquakes/);
  assert.equal(receipt.featureCount, snapshot.features.length);
  assert.equal(
    receipt.generatedAt,
    new Date(snapshot.metadata.generated).toISOString()
  );
  assert.equal(
    receipt.sha256,
    createHash('sha256').update(snapshotBytes).digest('hex')
  );
  assert.ok(Date.parse(receipt.retrievedAt) >= Date.parse(receipt.generatedAt));

  const validatedReceipt = validateFallbackReceipt(
    normalizeFeatureCollection(snapshot),
    receipt
  );
  assert.equal(validatedReceipt.featureCount, snapshot.features.length);
  assert.equal(Object.isFrozen(validatedReceipt), true);
  assert.throws(
    () =>
      validateFallbackReceipt(normalizeFeatureCollection(snapshot), {
        ...receipt,
        featureCount: receipt.featureCount + 1,
      }),
    /feature count does not match/
  );
});

test('requires every bundled data URL', () => {
  assert.throws(
    () => createDataSources('', 'snapshot', 'metadata'),
    /tectonicPlates/
  );
  assert.throws(
    () => createDataSources('plates', '', 'metadata'),
    /fallbackSnapshot/
  );
  assert.throws(
    () => createDataSources('plates', 'snapshot', ''),
    /fallbackMetadata/
  );
});

test('normalizes valid features and rejects malformed coordinates and values', () => {
  assert.equal(feature().properties.depth, 12);
  assert.equal(feature().properties.felt, null);
  assert.equal(
    normalizeFeature({
      geometry: { type: 'Point', coordinates: [400, 10, 2] },
      properties: {},
    }),
    null
  );
  assert.equal(
    normalizeFeature({
      geometry: { type: 'Point', coordinates: [10, 10, 2] },
      properties: { mag: 'not-a-number', time: 1 },
    }),
    null
  );
  assert.equal(
    normalizeFeature({
      geometry: { type: 'Point', coordinates: [10, 10, 2] },
      properties: { mag: null, time: 1 },
    }),
    null
  );
  assert.equal(
    normalizeFeature({
      geometry: { type: 'Point', coordinates: [null, 10, 2] },
      properties: { mag: 1, time: 1 },
    }),
    null
  );
});

test('preserves zero while keeping absent optional observations unknown', () => {
  assert.equal(toFiniteNumber(0), 0);
  assert.equal(toFiniteNumber('0'), 0);
  assert.equal(toFiniteNumber(null), null);
  assert.equal(toFiniteNumber('  '), null);

  const normalized = normalizeFeature({
    type: 'Feature',
    id: 'zero-felt',
    geometry: { type: 'Point', coordinates: [-117, 35, 12] },
    properties: { mag: 2, time: 1, felt: 0, updated: null },
  });
  assert.equal(normalized.properties.felt, 0);
  assert.equal(normalized.properties.updated, null);
});

test('preserves silent-refresh position and resolves revised selected events', () => {
  assert.equal(getRefreshTimelineIndex(4, { silent: true }), 4);
  assert.equal(getRefreshTimelineIndex(4), 29);
  assert.equal(getRefreshTimelineIndex('invalid', { silent: true }), 29);

  const original = feature({ id: 'revised', place: 'Original Ridge' });
  const revised = feature({ id: 'revised', place: 'Revised Ridge' });
  assert.equal(findFeatureById([revised], original.id), revised);
  assert.equal(findFeatureById([revised], 'missing'), null);
});

test('allowlists only official USGS event-page links', () => {
  assert.equal(
    isOfficialUsgsEventUrl(
      'https://earthquake.usgs.gov/earthquakes/eventpage/us-test'
    ),
    true
  );
  assert.equal(
    isOfficialUsgsEventUrl(
      'https://earthquake.usgs.gov.example.com/earthquakes/eventpage/x'
    ),
    false
  );
  assert.equal(isOfficialUsgsEventUrl('javascript:alert(1)'), false);
  assert.equal(
    feature({ url: 'https://example.com' }).properties.sourceUrl,
    null
  );
});

test('maps magnitude and depth to stable, redundant visual buckets', () => {
  assert.equal(getMagnitudeColor(0), '#75c7ff');
  assert.equal(getMagnitudeColor(4.2), '#f3a34b');
  assert.equal(getMagnitudeColor(6), '#ff3e5e');
  assert.equal(getDepthBucket(10), 'shallow');
  assert.equal(getDepthBucket(120), 'intermediate');
  assert.equal(getDepthBucket(500), 'deep');
  assert.deepEqual(
    getLegendEntries().map(({ label }) => label),
    ['< 2', '2–3', '3–4', '4–5', '5–6', '6+']
  );
});

test('filters one event set by time, magnitude, depth, and place search', () => {
  const end = Date.UTC(2026, 7, 15);
  const events = [
    feature({ id: 'a', mag: 6.1, place: 'Alaska', time: end, depth: 20 }),
    feature({
      id: 'b',
      mag: 4.4,
      place: 'Japan',
      time: end - DAY_MS,
      depth: 320,
    }),
    feature({
      id: 'c',
      mag: 2.2,
      place: 'Alaska',
      time: end - 20 * DAY_MS,
      depth: 10,
    }),
  ];
  assert.deepEqual(
    filterFeatures(events, {
      minMagnitude: 5,
      depth: 'shallow',
      startTime: end - 7 * DAY_MS,
      endTime: end,
      query: 'alas',
    }).map(({ id }) => id),
    ['a']
  );
});

test('selects strongest deterministically and derives summaries from filtered events', () => {
  const events = [
    feature({ id: 'b', mag: 5, sig: 50, time: 2 }),
    feature({ id: 'a', mag: 5, sig: 70, time: 1 }),
    feature({ id: 'c', mag: 4, sig: 900, time: 3 }),
  ];
  assert.equal(selectStrongest(events).id, 'a');
  assert.deepEqual(summarizeFeatures(events), {
    count: 3,
    strongestMagnitude: 5,
    shallowCount: 3,
    tsunamiCount: 0,
  });
});

test('builds honest timeline and live/fallback evidence labels', () => {
  const generated = Date.UTC(2026, 7, 15);
  assert.deepEqual(getTimelineBounds(generated, 30), {
    start: generated - 30 * DAY_MS,
    end: generated,
  });
  assert.match(
    getFeedStatus({ mode: 'live', feedGeneratedAt: generated }).detail,
    /2026-08-15/
  );
  assert.deepEqual(
    getFeedStatus({
      mode: 'fallback',
      snapshotMetadata: { retrievedAt: '2026-08-15T00:00:00.000Z' },
    }),
    {
      label: 'Fallback snapshot',
      detail: 'Significant events only · retrieved 2026-08-15T00:00:00.000Z',
      tone: 'fallback',
    }
  );
});

test('accepts and normalizes valid GeoJSON FeatureCollections', async () => {
  const payload = {
    type: 'FeatureCollection',
    metadata: { generated: Date.UTC(2026, 7, 15), title: 'Test feed' },
    features: [feature()],
  };
  const result = await fetchFeatureCollection(
    'https://example.test/feed',
    async () => ({
      ok: true,
      json: async () => payload,
    })
  );
  assert.equal(result.features.length, 1);
  assert.equal(result.metadata.acceptedCount, 1);
  assert.equal(result.metadata.rejectedCount, 0);
});

test('rejects HTTP, schema, and timeout failures with useful errors', async () => {
  await assert.rejects(
    fetchFeatureCollection('https://example.test/feed', async () => ({
      ok: false,
      status: 503,
    })),
    /HTTP 503/
  );
  assert.throws(
    () => normalizeFeatureCollection({ type: 'Feature' }),
    /FeatureCollection/
  );
  assert.throws(
    () =>
      normalizeFeatureCollection({ type: 'FeatureCollection', features: [] }),
    /generation time/
  );
  assert.throws(
    () =>
      normalizeFeatureCollection({
        type: 'FeatureCollection',
        metadata: { generated: Date.UTC(2026, 7, 15) },
        features: [{ geometry: { type: 'Point', coordinates: [] } }],
      }),
    /no valid earthquake features/
  );
  await assert.rejects(
    fetchFeatureCollection(
      'https://example.test/feed',
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      5
    ),
    /timed out after 5ms/
  );
});
