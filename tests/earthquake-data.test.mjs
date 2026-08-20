import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createDataSources,
  escapeHtml,
  fetchFeatureCollection,
  getEarthquakeColor,
  getEarthquakePopup,
  getEarthquakeRadius,
  getLegendEntries,
} from '../static/js/earthquake-data.js';

const dataSources = createDataSources(
  new URL('../static/data/PB2002_boundaries.json', import.meta.url)
);

test('uses maintained USGS feeds for both earthquake layers', () => {
  assert.match(
    dataSources.allEarthquakes,
    /^https:\/\/earthquake\.usgs\.gov\//
  );
  assert.match(dataSources.majorEarthquakes, /\/4\.5_week\.geojson$/);
});

test('uses the repository-owned tectonic-plate snapshot', async () => {
  assert.doesNotMatch(dataSources.tectonicPlates, /^https?:/);
  assert.match(dataSources.tectonicPlates, /PB2002_boundaries\.json$/);

  const payload = JSON.parse(
    await readFile(new URL(dataSources.tectonicPlates), 'utf8')
  );
  assert.equal(payload.type, 'FeatureCollection');
  assert.equal(payload.features.length, 241);
});

test('requires an explicit bundled tectonic-plate URL', () => {
  assert.throws(() => createDataSources('  '), /tectonic-plate URL/);
});

test('maps earthquake magnitudes to stable marker styles', () => {
  assert.equal(getEarthquakeColor(0), '#665191');
  assert.equal(getEarthquakeColor(4.2), '#ff7c43');
  assert.equal(getEarthquakeColor(6), '#ffa600');
  assert.equal(getEarthquakeColor(undefined), '#665191');
  assert.equal(getEarthquakeRadius(2.5), 10);
  assert.equal(getEarthquakeRadius(0), 1);
  assert.equal(getEarthquakeRadius(undefined), 1);
});

test('builds a complete legend contract', () => {
  assert.deepEqual(
    getLegendEntries().map(({ label }) => label),
    ['0–1', '1–2', '2–3', '3–4', '4–5', '5+']
  );
});

test('escapes external feed values before rendering popup HTML', () => {
  assert.equal(
    escapeHtml('<script>"x"</script>'),
    '&lt;script&gt;&quot;x&quot;&lt;/script&gt;'
  );
  assert.equal(
    getEarthquakePopup({ properties: { mag: 4.5, place: '<b>Unsafe</b>' } }),
    '<strong>Magnitude:</strong> 4.5<br><strong>Location:</strong> &lt;b&gt;Unsafe&lt;/b&gt;'
  );
  assert.equal(
    getEarthquakePopup({ properties: { mag: null, place: 'Test Ridge' } }),
    '<strong>Magnitude:</strong> Unknown<br><strong>Location:</strong> Test Ridge'
  );
});

test('accepts valid GeoJSON FeatureCollections', async () => {
  const payload = { type: 'FeatureCollection', features: [] };
  const result = await fetchFeatureCollection(
    'https://example.test/feed',
    async () => ({
      ok: true,
      json: async () => payload,
    })
  );

  assert.equal(result, payload);
});

test('rejects HTTP and schema failures with useful errors', async () => {
  await assert.rejects(
    fetchFeatureCollection('https://example.test/feed', async () => ({
      ok: false,
      status: 503,
    })),
    /HTTP 503/
  );
  await assert.rejects(
    fetchFeatureCollection('https://example.test/feed', async () => ({
      ok: true,
      json: async () => ({ type: 'Feature' }),
    })),
    /FeatureCollection/
  );
});

test('bounds stalled data requests with an abortable timeout', async () => {
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
