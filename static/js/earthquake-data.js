export const LIVE_DATA_SOURCE =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
export const FALLBACK_DATA_SOURCE =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';
export const DATA_REQUEST_TIMEOUT_MS = 10_000;
export const USGS_EVENT_ORIGIN = 'https://earthquake.usgs.gov';
export const DAY_MS = 86_400_000;

const MAGNITUDE_STOPS = Object.freeze([
  { min: 0, color: '#75c7ff', label: '< 2' },
  { min: 2, color: '#74dbc1', label: '2–3' },
  { min: 3, color: '#f2df74', label: '3–4' },
  { min: 4, color: '#f3a34b', label: '4–5' },
  { min: 5, color: '#ef6848', label: '5–6' },
  { min: 6, color: '#ff3e5e', label: '6+' },
]);

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

export function isFeatureCollection(payload) {
  return (
    payload?.type === 'FeatureCollection' && Array.isArray(payload.features)
  );
}

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

export function normalizeFeature(feature) {
  const coordinates = feature?.geometry?.coordinates;
  const longitude = Number(coordinates?.[0]);
  const latitude = Number(coordinates?.[1]);
  const depth = Number(coordinates?.[2]);
  const magnitude = Number(feature?.properties?.mag);
  const time = Number(feature?.properties?.time);

  if (
    feature?.geometry?.type !== 'Point' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(depth) ||
    !Number.isFinite(magnitude) ||
    !Number.isFinite(time)
  ) {
    return null;
  }

  const properties = feature.properties ?? {};
  const sourceUrl = isOfficialUsgsEventUrl(properties.url)
    ? properties.url
    : null;
  return {
    type: 'Feature',
    id: String(feature.id ?? `${longitude}:${latitude}:${time}`),
    geometry: { type: 'Point', coordinates: [longitude, latitude, depth] },
    properties: {
      mag: magnitude,
      place: String(properties.place || 'Unknown location'),
      time,
      updated: Number.isFinite(Number(properties.updated))
        ? Number(properties.updated)
        : null,
      depth,
      felt: Number.isFinite(Number(properties.felt))
        ? Number(properties.felt)
        : null,
      sig: Number.isFinite(Number(properties.sig)) ? Number(properties.sig) : 0,
      alert: ['green', 'yellow', 'orange', 'red'].includes(properties.alert)
        ? properties.alert
        : null,
      tsunami: Number(properties.tsunami) === 1,
      status: String(properties.status || 'unknown'),
      magType: String(properties.magType || 'unknown'),
      sourceUrl,
      title: String(properties.title || properties.place || 'Earthquake'),
    },
  };
}

export function normalizeFeatureCollection(payload) {
  if (!isFeatureCollection(payload)) {
    throw new Error('Response is not a GeoJSON FeatureCollection');
  }

  const generated = Number(payload?.metadata?.generated);
  if (!Number.isFinite(generated) || generated <= 0) {
    throw new Error('FeatureCollection is missing a valid generation time');
  }

  const features = payload.features.map(normalizeFeature).filter(Boolean);
  if (payload.features.length > 0 && features.length === 0) {
    throw new Error('FeatureCollection contains no valid earthquake features');
  }

  return {
    type: 'FeatureCollection',
    metadata: {
      generated,
      title: String(payload?.metadata?.title || 'USGS earthquake feed'),
      sourceCount: payload.features.length,
      acceptedCount: features.length,
      rejectedCount: payload.features.length - features.length,
    },
    features,
  };
}

export function validateFallbackReceipt(collection, receipt) {
  const generatedAt = Date.parse(String(receipt?.generatedAt ?? ''));
  const retrievedAt = Date.parse(String(receipt?.retrievedAt ?? ''));
  const featureCount = Number(receipt?.featureCount);
  const sha256 = String(receipt?.sha256 ?? '');

  if (receipt?.sourceUrl !== FALLBACK_DATA_SOURCE) {
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
    typeof receipt?.featureCount !== 'number' ||
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
    ...receipt,
    featureCount,
    generatedAt: new Date(generatedAt).toISOString(),
    retrievedAt: new Date(retrievedAt).toISOString(),
    sha256,
  });
}

export function getMagnitudeColor(magnitude) {
  const value = Number(magnitude);
  const selected = [...MAGNITUDE_STOPS]
    .reverse()
    .find(({ min }) => Number.isFinite(value) && value >= min);
  return selected?.color ?? MAGNITUDE_STOPS[0].color;
}

export function getLegendEntries() {
  return MAGNITUDE_STOPS.map(({ color, label }) => ({ color, label }));
}

export function getDepthBucket(depth) {
  const value = Number(depth);
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 70) return 'shallow';
  if (value <= 300) return 'intermediate';
  return 'deep';
}

export function getTimelineBounds(generatedAt, days = 30) {
  const end = Number(generatedAt);
  if (!Number.isFinite(end))
    throw new Error('A valid feed generation time is required');
  return { start: end - Math.max(1, Number(days)) * DAY_MS, end };
}

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
      ? `Significant events only · retrieved ${snapshotMetadata.retrievedAt}`
      : 'Significant events only · retrieval time unavailable',
    tone: 'fallback',
  };
}

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

export async function fetchFeatureCollection(
  url,
  request = fetch,
  timeoutMs = DATA_REQUEST_TIMEOUT_MS
) {
  return normalizeFeatureCollection(await fetchJson(url, request, timeoutMs));
}
