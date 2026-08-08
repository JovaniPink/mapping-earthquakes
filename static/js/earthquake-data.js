export const DATA_SOURCES = Object.freeze({
  allEarthquakes:
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  majorEarthquakes:
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
  tectonicPlates:
    'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json',
});

const MAGNITUDE_COLORS = Object.freeze([
  '#665191',
  '#a05195',
  '#d45087',
  '#f95d6a',
  '#ff7c43',
  '#ffa600',
]);

export function getEarthquakeColor(magnitude) {
  const value = Number(magnitude);

  if (!Number.isFinite(value) || value <= 1) return MAGNITUDE_COLORS[0];
  if (value <= 2) return MAGNITUDE_COLORS[1];
  if (value <= 3) return MAGNITUDE_COLORS[2];
  if (value <= 4) return MAGNITUDE_COLORS[3];
  if (value <= 5) return MAGNITUDE_COLORS[4];
  return MAGNITUDE_COLORS[5];
}

export function getEarthquakeRadius(magnitude) {
  const value = Number(magnitude);
  return Number.isFinite(value) && value > 0 ? value * 4 : 1;
}

export function getLegendEntries() {
  return MAGNITUDE_COLORS.map((color, index) => ({
    color,
    label:
      index === MAGNITUDE_COLORS.length - 1
        ? `${index}+`
        : `${index}–${index + 1}`,
  }));
}

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

export function getEarthquakePopup(feature) {
  const magnitude = Number(feature?.properties?.mag);
  const displayMagnitude = Number.isFinite(magnitude) ? magnitude : 'Unknown';
  const place = feature?.properties?.place || 'Unknown location';

  return `<strong>Magnitude:</strong> ${escapeHtml(displayMagnitude)}<br><strong>Location:</strong> ${escapeHtml(place)}`;
}

export async function fetchFeatureCollection(url, request = fetch) {
  const response = await request(url);

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (
    payload?.type !== 'FeatureCollection' ||
    !Array.isArray(payload.features)
  ) {
    throw new Error('Response is not a GeoJSON FeatureCollection');
  }

  return payload;
}
