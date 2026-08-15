import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const distDirectory = new URL('../dist/', import.meta.url);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const pathname = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(pathname) : [pathname];
    })
  );

  return files.flat();
}

test('ships the tectonic-plate snapshot without the GitHub runtime URL', async () => {
  const files = await listFiles(fileURLToPath(distDirectory));
  const tectonicFiles = files.filter(
    (filename) =>
      path.basename(filename).startsWith('PB2002_boundaries.') &&
      filename.endsWith('.json')
  );

  assert.ok(
    tectonicFiles.length >= 1,
    'expected at least one emitted tectonic snapshot'
  );
  const payloads = await Promise.all(
    tectonicFiles.map((filename) => readFile(filename, 'utf8').then(JSON.parse))
  );
  for (const payload of payloads) {
    assert.equal(payload.type, 'FeatureCollection');
    assert.equal(payload.features.length, 241);
  }

  const bundles = files.filter((filename) => filename.endsWith('.js'));
  const javascript = (
    await Promise.all(bundles.map((filename) => readFile(filename, 'utf8')))
  ).join('\n');
  assert.doesNotMatch(javascript, /raw\.githubusercontent\.com\/fraxen/);
});

test('ships the labeled USGS fallback and its receipt', async () => {
  const files = await listFiles(fileURLToPath(distDirectory));
  const fallbackFiles = files.filter((filename) =>
    path.basename(filename).startsWith('significant_month.')
  );
  const payloads = await Promise.all(
    fallbackFiles.map(async (filename) => ({
      filename,
      payload: JSON.parse(await readFile(filename, 'utf8')),
    }))
  );
  const snapshot = payloads.find(
    ({ payload }) => payload.type === 'FeatureCollection'
  );
  const receipt = payloads.find(
    ({ payload }) => payload.sourceUrl && payload.sha256
  );

  assert.ok(snapshot, 'expected the significant-event GeoJSON snapshot');
  assert.ok(receipt, 'expected the significant-event metadata receipt');
  assert.equal(snapshot.payload.features.length, receipt.payload.featureCount);
  assert.match(receipt.payload.sourceUrl, /^https:\/\/earthquake\.usgs\.gov\//);
});

test('builds MapLibre runtime with the official live feed and no retired snapshots', async () => {
  const files = await listFiles(fileURLToPath(distDirectory));
  const javascriptFiles = files.filter((filename) => filename.endsWith('.js'));
  const javascript = (
    await Promise.all(
      javascriptFiles.map((filename) => readFile(filename, 'utf8'))
    )
  ).join('\n');

  assert.ok(javascriptFiles.length > 0);
  assert.match(javascript, /all_month\.geojson/);
  assert.doesNotMatch(
    javascript,
    /all_week\.json|static\/data\/all_month\.geojson/
  );
  assert.doesNotMatch(
    javascript,
    /@parcel\/runtime-browser-hmr|Connection to the HMR server was lost/
  );
});

test('ships the social preview referenced by the built page', async () => {
  const files = await listFiles(fileURLToPath(distDirectory));
  const socialImages = files.filter(
    (filename) =>
      path.basename(filename).startsWith('social.') && filename.endsWith('.png')
  );

  assert.equal(socialImages.length, 1);
  const builtHtml = await readFile(
    new URL('index.html', distDirectory),
    'utf8'
  );
  const emittedPath = path
    .relative(fileURLToPath(distDirectory), socialImages[0])
    .split(path.sep)
    .join('/');
  assert.ok(
    builtHtml.includes(emittedPath),
    `expected built HTML to reference ${emittedPath}`
  );
  assert.doesNotMatch(
    builtHtml,
    /mapping-earthquakes\.netlify\.app\/static\/images\/social\.png/
  );
});
