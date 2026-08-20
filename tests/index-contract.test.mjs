import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const wdcHtml = await readFile(
  new URL('../wdc-usga-gov.html', import.meta.url),
  'utf8'
);
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

test('keeps the legacy Tableau connector dependency-free and explicit', () => {
  assert.match(html, /href="\.\/wdc-usga-gov\.html"/);
  assert.doesNotMatch(wdcHtml, /\$\.|jQuery/);
  assert.match(wdcHtml, /fetch\(/);
  assert.match(wdcHtml, /tableau\.abortWithError/);
  assert.match(wdcHtml, /WDC 2\.x framework/);
  assert.match(wdcHtml, /name="robots" content="noindex, nofollow"/);
  assert.match(wdcHtml, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(wdcHtml, /verification_token|property="fb:app_id"/);
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
  assert.match(
    html,
    /property="og:image"\s+content="\.\/static\/images\/social\.png"/
  );
  assert.match(
    html,
    /name="twitter:image"\s+content="\.\/static\/images\/social\.png"/
  );
});

test('uses a web-sized, dimensioned navigation image', () => {
  assert.match(
    compactHtml,
    /src="\.\/static\/images\/earthquake\.webp" width="512" height="512" alt=""/
  );
  assert.doesNotMatch(html, /earthquake\.png/);
});
