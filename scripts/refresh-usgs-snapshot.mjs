import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FALLBACK_DATA_SOURCE as SOURCE_URL } from '../static/js/earthquake-data.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotPath = resolve(root, 'static/data/significant_month.geojson');
const metadataPath = resolve(root, 'static/data/significant_month.meta.json');

function assertFeatureCollection(payload) {
  if (
    payload?.type !== 'FeatureCollection' ||
    !Array.isArray(payload.features) ||
    !Number.isFinite(Number(payload?.metadata?.generated))
  ) {
    throw new Error(
      'USGS response is not a generated GeoJSON FeatureCollection'
    );
  }
}

const response = await fetch(SOURCE_URL, {
  headers: { Accept: 'application/geo+json, application/json' },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error(`USGS snapshot request failed with HTTP ${response.status}`);
}

const payload = await response.json();
assertFeatureCollection(payload);

const snapshot = `${JSON.stringify(payload)}\n`;
const metadata = {
  source: 'USGS Earthquake Hazards Program',
  sourceUrl: SOURCE_URL,
  coverage: 'Significant earthquakes, past 30 days',
  retrievedAt: new Date().toISOString(),
  generatedAt: new Date(Number(payload.metadata.generated)).toISOString(),
  featureCount: payload.features.length,
  sha256: createHash('sha256').update(snapshot).digest('hex'),
};

await mkdir(dirname(snapshotPath), { recursive: true });
await writeFile(snapshotPath, snapshot, 'utf8');
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

console.log(
  `Refreshed ${metadata.featureCount} USGS significant events (${metadata.sha256.slice(0, 12)})`
);
