import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const compactHtml = html.replace(/\s+/g, ' ');

test('navigation labels target their matching sections', () => {
  assert.match(
    compactHtml,
    /href="#earthquake-mapping"\s*>Earthquake Mapping<\/a\s*>/
  );
  assert.match(
    compactHtml,
    /href="#tableau-mapping"\s*>Tableau Mapping<\/a\s*>/
  );
});

test('social metadata uses valid public contracts', () => {
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(
    html,
    /rel="canonical" href="https:\/\/mapping-earthquakes\.netlify\.app\/"/
  );
  assert.doesNotMatch(
    html,
    /verification_token|property="fb:app_id" content=""/
  );
});
