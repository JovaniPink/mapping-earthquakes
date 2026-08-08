import { Collapse, ScrollSpy } from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'url:leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'url:leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'url:leaflet/dist/images/marker-shadow.png';

import '../scss/app.scss';
import {
  DATA_SOURCES,
  fetchFeatureCollection,
  getEarthquakeColor,
  getEarthquakePopup,
  getEarthquakeRadius,
  getLegendEntries,
} from './earthquake-data.js';

const MAPBOX_TOKEN = process.env.API_KEY;
const ORLANDO = [28.538336, -81.379234];

const mapboxStyles = Object.freeze({
  dark: 'mapbox/dark-v11',
  light: 'mapbox/light-v11',
  satelliteStreets: 'mapbox/satellite-streets-v12',
});

L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

function createOpenStreetMapLayer() {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  });
}

function createMapboxTileLayer(styleId) {
  return L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    {
      accessToken: MAPBOX_TOKEN,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors; imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>',
      id: styleId,
      maxZoom: 18,
      tileSize: 512,
      zoomOffset: -1,
    }
  );
}

function createEarthquakeLayer(data) {
  return L.geoJSON(data, {
    pointToLayer: (_feature, latlng) => L.circleMarker(latlng),
    style: (feature) => ({
      color: '#000000',
      fillColor: getEarthquakeColor(feature?.properties?.mag),
      fillOpacity: 1,
      opacity: 1,
      radius: getEarthquakeRadius(feature?.properties?.mag),
      stroke: true,
      weight: 0.5,
    }),
    onEachFeature: (feature, layer) =>
      layer.bindPopup(getEarthquakePopup(feature)),
  });
}

function addLegend(map) {
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = () => {
    const container = L.DomUtil.create('div', 'info legend');

    getLegendEntries().forEach(({ color, label }) => {
      const row = document.createElement('div');
      const swatch = document.createElement('i');
      swatch.style.background = color;
      row.append(swatch, document.createTextNode(label));
      container.append(row);
    });

    return container;
  };

  legend.addTo(map);
}

function reportLayerFailures(results) {
  const failedLayers = results
    .filter(({ result }) => result.status === 'rejected')
    .map(({ label, result }) => {
      console.error(`Unable to load ${label}`, result.reason);
      return label;
    });

  if (failedLayers.length === 0) return;

  const status = document.querySelector('#earthquake-status');
  status.textContent = `Some live data could not be loaded: ${failedLayers.join(', ')}. Try refreshing in a moment.`;
  status.classList.remove('d-none');
}

// Single-location example.
const marker = L.marker(ORLANDO);
const popup = L.popup()
  .setLatLng(ORLANDO)
  .setContent('I am a standalone popup.');

L.map('map-single', {
  layers: [createOpenStreetMapLayer(), marker, popup],
}).setView(ORLANDO, 15);

// Population marker example.
const cities = [
  {
    location: [40.7128, -74.0059],
    city: 'New York City',
    state: 'NY',
    population: 8398748,
  },
  {
    location: [41.8781, -87.6298],
    city: 'Chicago',
    state: 'IL',
    population: 2705994,
  },
  {
    location: [29.7604, -95.3698],
    city: 'Houston',
    state: 'TX',
    population: 2325502,
  },
  {
    location: [34.0522, -118.2437],
    city: 'Los Angeles',
    state: 'CA',
    population: 3990456,
  },
  {
    location: [33.4484, -112.074],
    city: 'Phoenix',
    state: 'AZ',
    population: 1660272,
  },
];

const cityMarkers = cities.map((city) =>
  L.circleMarker(city.location, {
    color: '#582159',
    fillColor: '#582159',
    radius: city.population / 200000,
  }).bindPopup(
    `<h3>${city.city}, ${city.state}</h3><hr><h4>Population ${city.population.toLocaleString()}</h4>`
  )
);

const cityMap = L.map('map-multi', {
  layers: [createOpenStreetMapLayer(), ...cityMarkers],
});
cityMap.fitBounds(L.featureGroup(cityMarkers).getBounds(), {
  padding: [24, 24],
});

// Earthquake and tectonic-plate explorer.
const baseMaps = {
  OpenStreetMap: createOpenStreetMapLayer(),
};

if (MAPBOX_TOKEN) {
  Object.assign(baseMaps, {
    'Mapbox dark': createMapboxTileLayer(mapboxStyles.dark),
    'Mapbox light': createMapboxTileLayer(mapboxStyles.light),
    'Mapbox satellite streets': createMapboxTileLayer(
      mapboxStyles.satelliteStreets
    ),
  });
}
const overlays = {
  Earthquakes: L.layerGroup(),
  'Major earthquakes (M4.5+)': L.layerGroup(),
  'Tectonic plates': L.layerGroup(),
};

const earthquakeMap = L.map('map-earthquakes', {
  layers: [baseMaps.OpenStreetMap, ...Object.values(overlays)],
}).setView([20, 0], 2);

L.control.layers(baseMaps, overlays).addTo(earthquakeMap);
addLegend(earthquakeMap);

const layerRequests = [
  {
    label: 'earthquakes',
    result: fetchFeatureCollection(DATA_SOURCES.allEarthquakes).then((data) =>
      createEarthquakeLayer(data).addTo(overlays.Earthquakes)
    ),
  },
  {
    label: 'major earthquakes',
    result: fetchFeatureCollection(DATA_SOURCES.majorEarthquakes).then((data) =>
      createEarthquakeLayer(data).addTo(overlays['Major earthquakes (M4.5+)'])
    ),
  },
  {
    label: 'tectonic plates',
    result: fetchFeatureCollection(DATA_SOURCES.tectonicPlates).then((data) =>
      L.geoJSON(data, { style: { color: '#2f4b7c', weight: 3 } }).addTo(
        overlays['Tectonic plates']
      )
    ),
  },
];

Promise.allSettled(layerRequests.map(({ result }) => result)).then((results) =>
  reportLayerFailures(
    results.map((result, index) => ({
      label: layerRequests[index].label,
      result,
    }))
  )
);

// Native navigation behavior; Bootstrap 5 does not require jQuery.
document
  .querySelectorAll('a.js-scroll-trigger[href^="#"]:not([href="#"])')
  .forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.hash);
      if (!target) return;

      event.preventDefault();
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
        ? 'auto'
        : 'smooth';
      target.scrollIntoView({ behavior });
    });
  });

document.querySelectorAll('.js-scroll-trigger').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.navbar-collapse').forEach((element) => {
      Collapse.getOrCreateInstance(element, { toggle: false }).hide();
    });
  });
});

new ScrollSpy(document.body, { target: '#sideNav' });
