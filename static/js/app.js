import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import fallbackMetadataUrl from 'url:../data/significant_month.meta.json';
import fallbackSnapshotUrl from 'url:../data/significant_month.geojson';
import tectonicPlatesUrl from 'url:../data/PB2002_boundaries.json';

import '../scss/app.scss';
import {
  DAY_MS,
  createDataSources,
  fetchFeatureCollection,
  fetchJson,
  filterFeatures,
  getFeedStatus,
  getLegendEntries,
  selectStrongest,
  summarizeFeatures,
} from './earthquake-data.js';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/fiord';
const EMPTY_COLLECTION = Object.freeze({
  type: 'FeatureCollection',
  features: [],
});
const dataSources = createDataSources(
  tectonicPlatesUrl,
  fallbackSnapshotUrl,
  fallbackMetadataUrl
);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const elements = Object.fromEntries(
  [
    'feed-state',
    'feed-label',
    'feed-detail',
    'refresh-data',
    'summary-count',
    'summary-strongest',
    'summary-shallow',
    'place-search',
    'magnitude-filter',
    'magnitude-output',
    'depth-filter',
    'window-filter',
    'filter-summary',
    'focus-strongest',
    'reset-filters',
    'event-list',
    'result-count',
    'panel-notice',
    'panel-toggle',
    'atlas-panel-body',
    'projection-toggle',
    'toggle-events',
    'toggle-heat',
    'toggle-plates',
    'magnitude-legend',
    'event-detail',
    'close-detail',
    'event-detail-title',
    'detail-magnitude',
    'detail-time',
    'detail-depth',
    'detail-status',
    'detail-felt',
    'detail-significance',
    'detail-alert',
    'detail-coordinates',
    'detail-source',
    'map-message',
    'timeline-play',
    'timeline-date',
    'timeline-start',
    'timeline-end',
    'timeline-scrubber',
    'timeline-window',
  ].map((id) => [id, document.getElementById(id)])
);

const state = {
  allFeatures: [],
  filteredFeatures: [],
  feedGeneratedAt: null,
  mode: 'loading',
  snapshotMetadata: null,
  selectedId: null,
  timelineIndex: 29,
  windowDays: 7,
  isGlobe: true,
  mapReady: false,
  playbackId: null,
};

const map = new maplibregl.Map({
  container: 'earthquake-map',
  style: MAP_STYLE,
  center: [12, 18],
  zoom: 1.35,
  minZoom: 0.6,
  maxZoom: 14,
  maxPitch: 75,
  attributionControl: false,
  hash: false,
  canvasContextAttributes: { antialias: true },
});

map.addControl(
  new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
  'top-right'
);
map.addControl(new maplibregl.FullscreenControl(), 'top-right');

function eventCollection(features) {
  return { type: 'FeatureCollection', features };
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function magnitudeText(value) {
  return Number.isFinite(Number(value)) ? `M${Number(value).toFixed(1)}` : 'M—';
}

function getCurrentTimeWindow() {
  const end = state.feedGeneratedAt - (29 - state.timelineIndex) * DAY_MS;
  return { start: end - state.windowDays * DAY_MS, end };
}

function setFeedState(mode, detail) {
  const status = getFeedStatus({
    mode,
    feedGeneratedAt: state.feedGeneratedAt,
    snapshotMetadata: state.snapshotMetadata,
  });
  elements['feed-state'].dataset.tone = status.tone;
  elements['feed-label'].textContent = status.label;
  elements['feed-detail'].textContent = detail || status.detail;
}

function setLoadingState() {
  elements['feed-state'].dataset.tone = 'loading';
  elements['feed-label'].textContent = 'Connecting to USGS';
  elements['feed-detail'].textContent = 'Requesting the latest monthly feed…';
  elements['refresh-data'].disabled = true;
}

function setMapMessage(message) {
  elements['map-message'].textContent = message;
  elements['map-message'].hidden = !message;
}

function renderLegend() {
  const fragment = document.createDocumentFragment();
  getLegendEntries().forEach(({ color, label }) => {
    const item = document.createElement('span');
    const swatch = document.createElement('i');
    swatch.style.backgroundColor = color;
    item.append(swatch, document.createTextNode(label));
    fragment.append(item);
  });
  elements['magnitude-legend'].replaceChildren(fragment);
}

function renderSummary() {
  const summary = summarizeFeatures(state.filteredFeatures);
  elements['summary-count'].textContent = summary.count.toLocaleString();
  elements['summary-strongest'].textContent = magnitudeText(
    summary.strongestMagnitude
  );
  elements['summary-shallow'].textContent =
    summary.shallowCount.toLocaleString();
  elements['result-count'].textContent =
    `${summary.count.toLocaleString()} result${summary.count === 1 ? '' : 's'}`;
  elements['focus-strongest'].disabled = !selectStrongest(
    state.filteredFeatures
  );
}

function renderTimeline() {
  const fullStart = state.feedGeneratedAt - 29 * DAY_MS;
  const { end } = getCurrentTimeWindow();
  elements['timeline-date'].textContent = formatDate(end, { weekday: 'short' });
  elements['timeline-start'].textContent = formatDate(fullStart, {
    month: 'short',
    day: 'numeric',
  });
  elements['timeline-end'].textContent = formatDate(state.feedGeneratedAt, {
    month: 'short',
    day: 'numeric',
  });
  elements['timeline-window'].textContent = `${state.windowDays}-day window`;
  elements['timeline-scrubber'].value = String(state.timelineIndex);
}

function renderFilterSummary() {
  const minMagnitude = Number(elements['magnitude-filter'].value);
  const depthLabel =
    elements['depth-filter'].selectedOptions[0].textContent.split(' · ')[0];
  elements['magnitude-output'].textContent = `M${minMagnitude}+`;
  elements['filter-summary'].textContent =
    `M${minMagnitude}+ · ${depthLabel.toLowerCase()} · ${state.windowDays} days`;
}

function topEvents(features, limit = 5) {
  return [...features]
    .sort(
      (left, right) =>
        right.properties.mag - left.properties.mag ||
        right.properties.sig - left.properties.sig ||
        right.properties.time - left.properties.time
    )
    .slice(0, limit);
}

function renderEventList() {
  const fragment = document.createDocumentFragment();
  topEvents(state.filteredFeatures).forEach((feature) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    const magnitude = document.createElement('strong');
    const copy = document.createElement('span');
    const place = document.createElement('b');
    const detail = document.createElement('small');

    button.type = 'button';
    button.dataset.eventId = feature.id;
    magnitude.textContent = magnitudeText(feature.properties.mag);
    magnitude.style.setProperty(
      '--magnitude-color',
      feature.properties.mag >= 6 ? '#ff3e5e' : '#f3a34b'
    );
    place.textContent = feature.properties.place;
    detail.textContent = `${formatDateTime(feature.properties.time)} · ${feature.properties.depth.toFixed(1)} km deep`;
    copy.append(place, detail);
    button.append(magnitude, copy);
    item.append(button);
    fragment.append(item);
  });

  if (!fragment.childNodes.length) {
    const item = document.createElement('li');
    item.className = 'empty-result';
    item.textContent = 'No observed events match this exact window.';
    fragment.append(item);
  }

  elements['event-list'].replaceChildren(fragment);
}

function updateMapSources() {
  const collection = eventCollection(state.filteredFeatures);
  map.getSource('earthquake-heat')?.setData(collection);
  map.getSource('earthquake-events')?.setData(collection);
}

function applyFilters() {
  if (!state.feedGeneratedAt) return;
  const { start, end } = getCurrentTimeWindow();
  state.filteredFeatures = filterFeatures(state.allFeatures, {
    minMagnitude: Number(elements['magnitude-filter'].value),
    depth: elements['depth-filter'].value,
    startTime: start,
    endTime: end,
    query: elements['place-search'].value,
  });

  if (
    state.selectedId &&
    !state.filteredFeatures.some(({ id }) => id === state.selectedId)
  ) {
    closeDetail();
  }

  updateMapSources();
  renderSummary();
  renderTimeline();
  renderFilterSummary();
  renderEventList();
}

function setDetailText(id, value) {
  elements[id].textContent = value;
}

function selectEvent(feature, { moveMap = true } = {}) {
  if (!feature) return;
  state.selectedId = feature.id;
  const properties = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;

  setDetailText('detail-magnitude', magnitudeText(properties.mag));
  setDetailText('event-detail-title', properties.place);
  setDetailText('detail-time', formatDateTime(properties.time));
  setDetailText('detail-depth', `${properties.depth.toFixed(1)} km`);
  setDetailText(
    'detail-status',
    `${properties.status} · ${properties.magType}`
  );
  setDetailText(
    'detail-felt',
    properties.felt == null ? 'Not reported' : properties.felt.toLocaleString()
  );
  setDetailText('detail-significance', properties.sig.toLocaleString());
  setDetailText(
    'detail-alert',
    `${properties.alert ? properties.alert.toUpperCase() : 'None'}${properties.tsunami ? ' · tsunami flag' : ''}`
  );
  setDetailText(
    'detail-coordinates',
    `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
  );

  if (properties.sourceUrl) {
    elements['detail-source'].href = properties.sourceUrl;
    elements['detail-source'].removeAttribute('aria-disabled');
    elements['detail-source'].textContent = 'Open official USGS event ↗';
  } else {
    elements['detail-source'].href = 'https://earthquake.usgs.gov/';
    elements['detail-source'].setAttribute('aria-disabled', 'true');
    elements['detail-source'].textContent = 'USGS event link unavailable';
  }

  elements['event-detail'].hidden = false;
  map.getSource('selected-event')?.setData(eventCollection([feature]));
  if (moveMap) {
    map.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(map.getZoom(), 5.2),
      duration: reducedMotion.matches ? 0 : 1100,
      essential: false,
    });
  }
}

function closeDetail() {
  state.selectedId = null;
  elements['event-detail'].hidden = true;
  map.getSource('selected-event')?.setData(EMPTY_COLLECTION);
}

async function loadData({ silent = false } = {}) {
  if (!silent) setLoadingState();
  try {
    const collection = await fetchFeatureCollection(
      dataSources.liveEarthquakes
    );
    state.allFeatures = collection.features;
    state.feedGeneratedAt = collection.metadata.generated || Date.now();
    state.mode = 'live';
    state.snapshotMetadata = null;
    state.timelineIndex = 29;
    setFeedState('live');
    elements['panel-notice'].hidden = true;
  } catch (liveError) {
    console.warn(
      'Unable to load the live USGS monthly feed; using the labeled fallback.',
      liveError
    );
    try {
      const [collection, metadata] = await Promise.all([
        fetchFeatureCollection(dataSources.fallbackSnapshot),
        fetchJson(dataSources.fallbackMetadata),
      ]);
      state.allFeatures = collection.features;
      state.snapshotMetadata = metadata;
      state.feedGeneratedAt =
        collection.metadata.generated || Date.parse(metadata.generatedAt);
      state.mode = 'fallback';
      state.timelineIndex = 29;
      setFeedState('fallback');
      elements['panel-notice'].textContent =
        'The live monthly feed is unavailable. The map is showing a narrower, committed snapshot of significant events only.';
      elements['panel-notice'].hidden = false;
    } catch (fallbackError) {
      console.error(
        'Unable to load live or fallback earthquake data.',
        fallbackError
      );
      state.allFeatures = [];
      state.filteredFeatures = [];
      state.feedGeneratedAt = Date.now();
      elements['feed-state'].dataset.tone = 'error';
      elements['feed-label'].textContent = 'Earthquake data unavailable';
      elements['feed-detail'].textContent =
        'Neither the live feed nor bundled fallback could be read.';
      elements['panel-notice'].textContent =
        'Map controls remain available, but no event claims are shown.';
      elements['panel-notice'].hidden = false;
    }
  } finally {
    elements['refresh-data'].disabled = false;
    elements['timeline-scrubber'].disabled = !state.allFeatures.length;
    elements['timeline-play'].disabled =
      !state.allFeatures.length || reducedMotion.matches;
    applyFilters();
  }
}

function addEarthquakeLayers() {
  const firstLabel = map
    .getStyle()
    .layers.find(({ type }) => type === 'symbol')?.id;
  map.addSource('tectonic-plates', {
    type: 'geojson',
    data: dataSources.tectonicPlates,
  });
  map.addSource('earthquake-heat', { type: 'geojson', data: EMPTY_COLLECTION });
  map.addSource('earthquake-events', {
    type: 'geojson',
    data: EMPTY_COLLECTION,
    cluster: true,
    clusterMaxZoom: 4,
    clusterRadius: 42,
  });
  map.addSource('selected-event', { type: 'geojson', data: EMPTY_COLLECTION });

  map.addLayer(
    {
      id: 'tectonic-lines',
      type: 'line',
      source: 'tectonic-plates',
      paint: {
        'line-color': '#85a2ac',
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.55, 8, 1.4],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.32, 6, 0.65],
        'line-dasharray': [2, 2],
      },
    },
    firstLabel
  );
  map.addLayer(
    {
      id: 'earthquake-heat',
      type: 'heatmap',
      source: 'earthquake-heat',
      maxzoom: 6,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'mag'],
          0,
          0.08,
          7,
          1,
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.7,
          6,
          1.8,
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 6, 26],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.72,
          5,
          0.42,
          6,
          0,
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(117,199,255,0)',
          0.25,
          'rgba(116,219,193,0.45)',
          0.5,
          'rgba(242,223,116,0.62)',
          0.75,
          'rgba(243,163,75,0.76)',
          1,
          'rgba(255,62,94,0.92)',
        ],
      },
    },
    firstLabel
  );
  map.addLayer({
    id: 'event-clusters',
    type: 'circle',
    source: 'earthquake-events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        'rgba(117,199,255,0.76)',
        100,
        'rgba(242,223,116,0.82)',
        500,
        'rgba(255,62,94,0.86)',
      ],
      'circle-radius': ['step', ['get', 'point_count'], 14, 100, 20, 500, 27],
      'circle-stroke-color': 'rgba(244,239,225,0.8)',
      'circle-stroke-width': 1,
      'circle-blur': 0.05,
    },
  });
  map.addLayer({
    id: 'event-cluster-count',
    type: 'symbol',
    source: 'earthquake-events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 11,
      'text-font': ['Noto Sans Regular'],
    },
    paint: { 'text-color': '#071016' },
  });
  map.addLayer({
    id: 'event-points',
    type: 'circle',
    source: 'earthquake-events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        ['interpolate', ['linear'], ['get', 'mag'], 0, 2.5, 7, 9],
        10,
        ['interpolate', ['linear'], ['get', 'mag'], 0, 5, 7, 26],
      ],
      'circle-color': [
        'step',
        ['get', 'mag'],
        '#75c7ff',
        2,
        '#74dbc1',
        3,
        '#f2df74',
        4,
        '#f3a34b',
        5,
        '#ef6848',
        6,
        '#ff3e5e',
      ],
      'circle-opacity': 0.88,
      'circle-stroke-color': '#f4efe1',
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        0.4,
        8,
        1.3,
      ],
    },
  });
  map.addLayer({
    id: 'selected-event-halo',
    type: 'circle',
    source: 'selected-event',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 11, 10, 34],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-opacity': 0.95,
    },
  });
}

function eventFromMapFeature(renderedFeature) {
  return (
    state.filteredFeatures.find(
      ({ id }) => id === String(renderedFeature.id)
    ) ?? null
  );
}

function bindMapInteractions() {
  map.on('click', 'event-clusters', async (event) => {
    const cluster = event.features?.[0];
    if (!cluster) return;
    const source = map.getSource('earthquake-events');
    const zoom = await source.getClusterExpansionZoom(
      cluster.properties.cluster_id
    );
    map.easeTo({
      center: cluster.geometry.coordinates,
      zoom,
      duration: reducedMotion.matches ? 0 : 650,
    });
  });

  map.on('click', 'event-points', (event) => {
    const feature = eventFromMapFeature(event.features?.[0]);
    selectEvent(feature, { moveMap: false });
  });

  const hoverPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
    className: 'event-hover-popup',
  });
  map.on('mouseenter', 'event-points', (event) => {
    map.getCanvas().style.cursor = 'pointer';
    const feature = eventFromMapFeature(event.features?.[0]);
    if (!feature) return;
    const content = document.createElement('div');
    const strong = document.createElement('strong');
    const place = document.createElement('span');
    strong.textContent = magnitudeText(feature.properties.mag);
    place.textContent = feature.properties.place;
    content.append(strong, place);
    hoverPopup
      .setLngLat(feature.geometry.coordinates.slice(0, 2))
      .setDOMContent(content)
      .addTo(map);
  });
  map.on('mouseleave', 'event-points', () => {
    map.getCanvas().style.cursor = '';
    hoverPopup.remove();
  });
}

function setLayerVisibility(layerIds, visible) {
  layerIds.forEach((id) => {
    if (map.getLayer(id))
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
}

function stopPlayback() {
  if (state.playbackId) window.clearInterval(state.playbackId);
  state.playbackId = null;
  elements['timeline-play'].classList.remove('is-playing');
  elements['timeline-play'].querySelector('span').textContent = '▶';
  elements['timeline-play'].setAttribute(
    'aria-label',
    'Play the 30-day earthquake timeline'
  );
}

function startPlayback() {
  if (reducedMotion.matches || !state.allFeatures.length) return;
  if (state.playbackId) {
    stopPlayback();
    return;
  }
  if (state.timelineIndex >= 29) state.timelineIndex = 0;
  elements['timeline-play'].classList.add('is-playing');
  elements['timeline-play'].querySelector('span').textContent = 'Ⅱ';
  elements['timeline-play'].setAttribute(
    'aria-label',
    'Pause the 30-day earthquake timeline'
  );
  applyFilters();
  state.playbackId = window.setInterval(() => {
    if (state.timelineIndex >= 29) {
      stopPlayback();
      return;
    }
    state.timelineIndex += 1;
    applyFilters();
  }, 700);
}

function resetFilters() {
  elements['place-search'].value = '';
  elements['magnitude-filter'].value = '0';
  elements['depth-filter'].value = 'all';
  elements['window-filter'].value = '7';
  state.windowDays = 7;
  state.timelineIndex = 29;
  stopPlayback();
  applyFilters();
}

function bindControls() {
  elements['place-search'].addEventListener('input', applyFilters);
  elements['magnitude-filter'].addEventListener('input', applyFilters);
  elements['depth-filter'].addEventListener('change', applyFilters);
  elements['window-filter'].addEventListener('change', () => {
    state.windowDays = Number(elements['window-filter'].value);
    applyFilters();
  });
  elements['timeline-scrubber'].addEventListener('input', () => {
    stopPlayback();
    state.timelineIndex = Number(elements['timeline-scrubber'].value);
    applyFilters();
  });
  elements['timeline-play'].addEventListener('click', startPlayback);
  elements['refresh-data'].addEventListener('click', () => loadData());
  elements['reset-filters'].addEventListener('click', resetFilters);
  elements['focus-strongest'].addEventListener('click', () =>
    selectEvent(selectStrongest(state.filteredFeatures))
  );
  elements['close-detail'].addEventListener('click', closeDetail);
  elements['event-list'].addEventListener('click', (event) => {
    const button = event.target.closest('button[data-event-id]');
    if (!button) return;
    selectEvent(
      state.filteredFeatures.find(({ id }) => id === button.dataset.eventId)
    );
  });
  elements['panel-toggle'].addEventListener('click', () => {
    const expanded =
      elements['panel-toggle'].getAttribute('aria-expanded') === 'true';
    elements['panel-toggle'].setAttribute('aria-expanded', String(!expanded));
    elements['panel-toggle'].querySelector('[aria-hidden]').textContent =
      expanded ? '+' : '−';
    elements['panel-toggle'].querySelector('.visually-hidden').textContent =
      expanded ? 'Expand atlas panel' : 'Collapse atlas panel';
    elements['atlas-panel-body'].hidden = expanded;
    document
      .querySelector('.atlas-panel')
      .classList.toggle('is-collapsed', expanded);
  });
  elements['projection-toggle'].addEventListener('click', () => {
    state.isGlobe = !state.isGlobe;
    map.setProjection({ type: state.isGlobe ? 'globe' : 'mercator' });
    elements['projection-toggle'].textContent = state.isGlobe
      ? 'Mercator'
      : 'Globe';
  });
  elements['toggle-events'].addEventListener('change', () =>
    setLayerVisibility(
      [
        'event-clusters',
        'event-cluster-count',
        'event-points',
        'selected-event-halo',
      ],
      elements['toggle-events'].checked
    )
  );
  elements['toggle-heat'].addEventListener('change', () =>
    setLayerVisibility(['earthquake-heat'], elements['toggle-heat'].checked)
  );
  elements['toggle-plates'].addEventListener('change', () =>
    setLayerVisibility(['tectonic-lines'], elements['toggle-plates'].checked)
  );
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stopPlayback();
    elements['timeline-play'].disabled =
      !state.allFeatures.length || reducedMotion.matches;
  });
}

map.on('load', () => {
  state.mapReady = true;
  try {
    map.setProjection({ type: 'globe' });
  } catch (error) {
    console.warn(
      'Globe projection is unavailable; retaining the default projection.',
      error
    );
    state.isGlobe = false;
  }
  elements['projection-toggle'].textContent = state.isGlobe
    ? 'Mercator'
    : 'Globe';
  addEarthquakeLayers();
  bindMapInteractions();
  applyFilters();
  setMapMessage('');
});

map.on('error', (event) => {
  if (
    event?.sourceId === 'earthquake-events' ||
    event?.sourceId === 'earthquake-heat'
  )
    return;
  setMapMessage(
    'The basemap reported a service error. Data controls remain available.'
  );
});

map.on('idle', () => setMapMessage(''));

renderLegend();
bindControls();
void loadData();
window.setTimeout(() => {
  if (!state.mapReady) {
    setMapMessage(
      'The basemap is taking longer than expected. Observed data and controls remain available.'
    );
  }
}, 8_000);
window.setInterval(() => loadData({ silent: true }), 60_000);
