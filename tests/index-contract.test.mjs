import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const wdcHtml = await readFile(
  new URL('../wdc-usga-gov.html', import.meta.url),
  'utf8'
);
const compactHtml = html.replace(/\s+/g, ' ');

test('presents one full-screen atlas landmark instead of tutorial sections', () => {
  assert.match(
    compactHtml,
    /<main class="atlas-shell" aria-label="Earthquake Atlas">/
  );
  assert.match(html, /id="earthquake-map"/);
  assert.match(html, /id="atlas-controls"/);
  assert.match(html, /id="event-detail"/);
  assert.match(html, /id="timeline-scrubber"/);
  assert.doesNotMatch(
    html,
    /id="earthquake-mapping"|id="tableau-mapping"|<iframe/
  );
});

test('exposes semantic search, filtering, discovery, layers, and timeline controls', () => {
  for (const id of [
    'place-search',
    'magnitude-filter',
    'depth-filter',
    'window-filter',
    'focus-strongest',
    'toggle-events',
    'toggle-heat',
    'toggle-plates',
    'timeline-play',
    'timeline-scrubber',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /class="skip-link" href="#atlas-controls"/);
  assert.match(html, /role="status"/);
  assert.match(html, /role="alert"/);
});

test('keeps evidence labels and official event navigation in the page contract', () => {
  assert.match(html, /Observed data/);
  assert.match(
    compactHtml,
    /href="https:\/\/earthquake\.usgs\.gov\/"[^>]*>USGS<\/a\s*>/
  );
  assert.match(html, /USGS observed event/);
  assert.match(html, /id="detail-source"/);
  assert.match(html, /href="\.\/THIRD_PARTY_DATA\.md"/);
});

test('keeps visible attribution for the basemap stack', () => {
  assert.match(html, /href="https:\/\/openfreemap\.org\/"/);
  assert.match(html, /href="https:\/\/maplibre\.org\/"/);
  assert.match(html, /href="https:\/\/www\.openmaptiles\.org\/"/);
  assert.match(html, /href="https:\/\/www\.openstreetmap\.org\/copyright"/);
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
  assert.match(html, /property="og:title" content="Earthquake Atlas"/);
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
