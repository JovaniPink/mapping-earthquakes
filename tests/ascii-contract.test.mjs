import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const excludedDirectories = new Set([
  '.git',
  'dist',
  'node_modules',
  'playwright-report',
  'resources',
  'test-results',
]);
const exactByteSources = new Set([
  'static/data/PB2002_boundaries.json',
  'static/data/significant_month.geojson',
]);
const textExtensions = new Set([
  '.css',
  '.geojson',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.scss',
  '.txt',
  '.webmanifest',
  '.yaml',
  '.yml',
]);
const textDotfiles = new Set([
  '.browserslistrc',
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.prettierignore',
]);

async function findTextFiles(directory = repositoryRoot) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;

    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTextFiles(absolutePath)));
      continue;
    }

    const repositoryPath = relative(repositoryRoot, absolutePath);
    if (
      !exactByteSources.has(repositoryPath) &&
      (textExtensions.has(extname(entry.name)) || textDotfiles.has(entry.name))
    ) {
      files.push({ absolutePath, repositoryPath });
    }
  }
  return files;
}

test('keeps repository-owned text in plain ASCII', async () => {
  const violations = [];

  for (const { absolutePath, repositoryPath } of await findTextFiles()) {
    const contents = await readFile(absolutePath, 'utf8');
    const match = contents.match(/[^\x00-\x7f]/u);
    if (match) {
      violations.push(
        `${repositoryPath}: U+${match[0].codePointAt(0).toString(16)}`
      );
    }
  }

  assert.deepEqual(violations, []);
});
