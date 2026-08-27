/**
 * @import {
 *   AlertLevel,
 *   DepthBucket,
 *   EarthquakeFeature,
 *   EarthquakeFeatureCollection,
 *   FallbackReceipt,
 *   FeatureFilters,
 *   FeedMode,
 *   JsonRequest,
 *   RawFeatureCollection,
 * } from '../../types/earthquake.d.ts'
 */

export const LIVE_DATA_SOURCE =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
export const FALLBACK_DATA_SOURCE =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';
export const DATA_REQUEST_TIMEOUT_MS = 10_000;
export const USGS_EVENT_ORIGIN = 'https://earthquake.usgs.gov';
export const DAY_MS = 86_400_000;

const MAGNITUDE_STOPS = Object.freeze([
  { min: 0, color: '#75c7ff', label: '< 2' },
  { min: 2, color: '#74dbc1', label: '2-3' },
  { min: 3, color: '#f2df74', label: '3-4' },
  { min: 4, color: '#f3a34b', label: '4-5' },
  { min: 5, color: '#ef6848', label: '5-6' },
  { min: 6, color: '#ff3e5e', label: '6+' },
]);

const ALERT_LEVELS = new Set(['green', 'yellow', 'orange', 'red']);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * @param {unknown} tectonicPlatesUrl
 * @param {unknown} fallbackSnapshotUrl
 * @param {unknown} fallbackMetadataUrl
 */
export function createDataSources(
  tectonicPlatesUrl,
  fallbackSnapshotUrl,
  fallbackMetadataUrl
) {
  const values = {
    tectonicPlates: String(tectonicPlatesUrl ?? '').trim(),
    fallbackSnapshot: String(fallbackSnapshotUrl ?? '').trim(),
    fallbackMetadata: String(fallbackMetadataUrl ?? '').trim(),
  };

  for (const [label, value] of Object.entries(values)) {
    if (!value) throw new Error(`A bundled ${label} URL is required`);
  }

  return Object.freeze({ liveEarthquakes: LIVE_DATA_SOURCE, ...values });
}

/**
 * @param {unknown} payload
 * @returns {payload is RawFeatureCollection}
 */
export function isFeatureCollection(payload) {
  return (
    isRecord(payload) &&
    payload.type === 'FeatureCollection' &&
    Array.isArray(payload.features)
  );
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function toFiniteNumber(value) {
  if (
    value == null ||
    (typeof value === 'string' && value.trim().length === 0)
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** @param {unknown} value */
export function isOfficialUsgsEventUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    return (
      url.origin === USGS_EVENT_ORIGIN &&
      url.pathname.startsWith('/earthquakes/eventpage/')
    );
  } catch {
    return false;
  }
}

/**
 * @param {unknown} feature
 * @returns {EarthquakeFeature | null}
 */
export function normalizeFeature(feature) {
  const candidate = isRecord(feature) ? feature : {};
  const geometry = isRecord(candidate.geometry) ? candidate.geometry : {};
  const properties = isRecord(candidate.properties) ? candidate.properties : {};
  const coordinates = Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : [];
  const longitude = toFiniteNumber(coordinates?.[0]);
  const latitude = toFiniteNumber(coordinates?.[1]);
  const depth = toFiniteNumber(coordinates?.[2]);
  const magnitude = toFiniteNumber(properties.mag);
  const time = toFiniteNumber(properties.time);

  if (
    geometry.type !== 'Point' ||
    longitude == null ||
    latitude == null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    depth == null ||
    magnitude == null ||
    time == null
  ) {
    return null;
  }

  const sourceUrl = isOfficialUsgsEventUrl(properties.url)
    ? String(properties.url)
    : null;
  const alert =
    typeof properties.alert === 'string' && ALERT_LEVELS.has(properties.alert)
      ? /** @type {AlertLevel} */ (properties.alert)
      : null;
  return {
    type: 'Feature',
    id: String(candidate.id ?? `${longitude}:${latitude}:${time}`),
    geometry: {
      type: 'Point',
      coordinates: /** @type {[number, number, number]} */ ([
        longitude,
        latitude,
        depth,
      ]),
    },
    properties: {
      mag: magnitude,
      place: String(properties.place || 'Unknown location'),
      time,
      updated: toFiniteNumber(properties.updated),
      depth,
      felt: toFiniteNumber(properties.felt),
      sig: toFiniteNumber(properties.sig) ?? 0,
      alert,
      tsunami: Number(properties.tsunami) === 1,
      status: String(properties.status || 'unknown'),
      magType: String(properties.magType || 'unknown'),
      sourceUrl,
      title: String(properties.title || properties.place || 'Earthquake'),
    },
  };
}

/**
 * @param {unknown} payload
 * @returns {EarthquakeFeatureCollection}
 */
export function normalizeFeatureCollection(payload) {
  if (!isFeatureCollection(payload)) {
    throw new Error('Response is not a GeoJSON FeatureCollection');
  }

  const metadata = isRecord(payload.metadata) ? payload.metadata : {};
  const generated = Number(metadata.generated);
  if (!Number.isFinite(generated) || generated <= 0) {
    throw new Error('FeatureCollection is missing a valid generation time');
  }

  const features = payload.features
    .map(normalizeFeature)
    .filter((feature) => feature !== null);
  if (payload.features.length > 0 && features.length === 0) {
    throw new Error('FeatureCollection contains no valid earthquake features');
  }

  return {
    type: 'FeatureCollection',
    metadata: {
      generated,
      title: String(metadata.title || 'USGS earthquake feed'),
      sourceCount: payload.features.length,
      acceptedCount: features.length,
      rejectedCount: payload.features.length - features.length,
    },
    features,
  };
}

/**
 * @param {unknown} currentIndex
 * @param {{silent?: boolean}} [options]
 */
export function getRefreshTimelineIndex(currentIndex, { silent = false } = {}) {
  const index = toFiniteNumber(currentIndex);
  return silent &&
    index != null &&
    Number.isInteger(index) &&
    index >= 0 &&
    index <= 29
    ? index
    : 29;
}

/**
 * @param {EarthquakeFeature[]} features
 * @param {unknown} selectedId
 */
export function findFeatureById(features, selectedId) {
  if (selectedId == null || !Array.isArray(features)) return null;
  return features.find(({ id }) => id === selectedId) ?? null;
}

/**
 * @param {EarthquakeFeatureCollection} collection
 * @param {unknown} receipt
 * @returns {Readonly<FallbackReceipt>}
 */
export function validateFallbackReceipt(collection, receipt) {
  const candidate = isRecord(receipt) ? receipt : {};
  const generatedAt = Date.parse(String(candidate.generatedAt ?? ''));
  const retrievedAt = Date.parse(String(candidate.retrievedAt ?? ''));
  const featureCount = Number(candidate.featureCount);
  const sha256 = String(candidate.sha256 ?? '');

  if (candidate.sourceUrl !== FALLBACK_DATA_SOURCE) {
    throw new Error('Fallback receipt has an unexpected source URL');
  }
  if (
    !Number.isFinite(generatedAt) ||
    generatedAt !== collection?.metadata?.generated
  ) {
    throw new Error('Fallback receipt generation time does not match');
  }
  if (!Number.isFinite(retrievedAt) || retrievedAt < generatedAt) {
    throw new Error('Fallback receipt retrieval time is invalid');
  }
  if (
    typeof candidate.featureCount !== 'number' ||
    !Number.isSafeInteger(featureCount) ||
    featureCount < 0 ||
    featureCount !== collection?.metadata?.sourceCount
  ) {
    throw new Error('Fallback receipt feature count does not match');
  }
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error('Fallback receipt SHA-256 is invalid');
  }

  return Object.freeze({
    ...candidate,
    source: typeof candidate.source === 'string' ? candidate.source : undefined,
    coverage:
      typeof candidate.coverage === 'string' ? candidate.coverage : undefined,
    sourceUrl: FALLBACK_DATA_SOURCE,
    featureCount,
    generatedAt: new Date(generatedAt).toISOString(),
    retrievedAt: new Date(retrievedAt).toISOString(),
    sha256,
  });
}

/** @param {unknown} magnitude */
export function getMagnitudeColor(magnitude) {
  const value = Number(magnitude);
  const selected = [...MAGNITUDE_STOPS]
    .reverse()
    .find(({ min }) => Number.isFinite(value) && value >= min);
  return selected?.color ?? MAGNITUDE_STOPS.at(0)?.color ?? '#75c7ff';
}

export function getLegendEntries() {
  return MAGNITUDE_STOPS.map(({ color, label }) => ({ color, label }));
}

/**
 * @param {unknown} depth
 * @returns {Exclude<DepthBucket, 'all'>}
 */
export function getDepthBucket(depth) {
  const value = Number(depth);
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 70) return 'shallow';
  if (value <= 300) return 'intermediate';
  return 'deep';
}

/**
 * @param {unknown} generatedAt
 * @param {number} [days]
 */
export function getTimelineBounds(generatedAt, days = 30) {
  const end = Number(generatedAt);
  if (!Number.isFinite(end))
    throw new Error('A valid feed generation time is required');
  return { start: end - Math.max(1, Number(days)) * DAY_MS, end };
}

/**
 * @param {EarthquakeFeature[]} features
 * @param {FeatureFilters} filters
 */
export function filterFeatures(
  features,
  {
    minMagnitude = 0,
    depth = 'all',
    startTime = -Infinity,
    endTime = Infinity,
    query = '',
  }
) {
  const normalizedQuery = String(query).trim().toLocaleLowerCase();
  return features.filter((feature) => {
    const properties = feature.properties;
    return (
      properties.mag >= Number(minMagnitude) &&
      (depth === 'all' || getDepthBucket(properties.depth) === depth) &&
      properties.time >= Number(startTime) &&
      properties.time <= Number(endTime) &&
      (!normalizedQuery ||
        properties.place.toLocaleLowerCase().includes(normalizedQuery))
    );
  });
}

/** @param {EarthquakeFeature[]} features */
export function selectStrongest(features) {
  return (
    [...features].sort(
      (left, right) =>
        right.properties.mag - left.properties.mag ||
        right.properties.sig - left.properties.sig ||
        right.properties.time - left.properties.time ||
        left.id.localeCompare(right.id)
    )[0] ?? null
  );
}

/** @param {EarthquakeFeature[]} features */
export function summarizeFeatures(features) {
  const strongest = selectStrongest(features);
  return {
    count: features.length,
    strongestMagnitude: strongest?.properties.mag ?? null,
    shallowCount: features.filter(
      ({ properties }) => getDepthBucket(properties.depth) === 'shallow'
    ).length,
    tsunamiCount: features.filter(({ properties }) => properties.tsunami)
      .length,
  };
}

/**
 * @param {{
 *   mode: FeedMode,
 *   feedGeneratedAt?: number | null,
 *   snapshotMetadata?: Pick<FallbackReceipt, 'retrievedAt'> | null,
 * }} options
 */
export function getFeedStatus({ mode, feedGeneratedAt, snapshotMetadata }) {
  if (mode === 'live') {
    return {
      label: 'Live USGS feed',
      detail: Number.isFinite(Number(feedGeneratedAt))
        ? `Generated ${new Date(Number(feedGeneratedAt)).toISOString()}`
        : 'Generation time unavailable',
      tone: 'live',
    };
  }

  return {
    label: 'Fallback snapshot',
    detail: snapshotMetadata?.retrievedAt
      ? `Significant events only | retrieved ${snapshotMetadata.retrievedAt}`
      : 'Significant events only | retrieval time unavailable',
    tone: 'fallback',
  };
}

/**
 * @param {string | URL} url
 * @param {JsonRequest} [request]
 * @param {number} [timeoutMs]
 * @returns {Promise<unknown>}
 */
export async function fetchJson(
  url,
  request = fetch,
  timeoutMs = DATA_REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await request(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`Request failed with HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Data request timed out after ${timeoutMs}ms`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * @param {string | URL} url
 * @param {JsonRequest} [request]
 * @param {number} [timeoutMs]
 * @returns {Promise<EarthquakeFeatureCollection>}
 */
export async function fetchFeatureCollection(
  url,
  request = fetch,
  timeoutMs = DATA_REQUEST_TIMEOUT_MS
) {
  return normalizeFeatureCollection(await fetchJson(url, request, timeoutMs));
}
