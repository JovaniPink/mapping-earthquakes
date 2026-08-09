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

  assert.equal(tectonicFiles.length, 1);
  const payload = JSON.parse(await readFile(tectonicFiles[0], 'utf8'));
  assert.equal(payload.type, 'FeatureCollection');
  assert.equal(payload.features.length, 241);

  const bundles = files.filter((filename) => filename.endsWith('.js'));
  const javascript = (
    await Promise.all(bundles.map((filename) => readFile(filename, 'utf8')))
  ).join('\n');
  assert.doesNotMatch(javascript, /raw\.githubusercontent\.com\/fraxen/);
});
