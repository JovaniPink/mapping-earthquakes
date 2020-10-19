// Import config
import dotenv from 'dotenv';
dotenv.config();
const API_KEY = process.env.API_KEY;
// import { API_KEY } from './config.js';

// Importing jQuery
import $ from 'jquery';

// Importing jQuery Easing Plugin
import 'jquery.easing';

// Import Bootstrap
import 'bootstrap';

// Importing the custom scss
import '../scss/style.scss';

// Leaflet CSS
import '../../node_modules/leaflet/dist/leaflet.css';
import '../../node_modules/leaflet-draw/dist/leaflet.draw.css';

// Importing Leaflet
import L from 'leaflet';
// import 'leaflet-draw';
// import * as ELG from 'esri-leaflet-geocoder';

// Import Data
// import eq from '../data/all_week.json';
// import plates from '../data/PB2002_boundaries.json';

//
// Single Point
//

const mapboxStyles = {
  streets: 'mapbox/streets-v11',
  outdoors: 'mapbox/outdoors-v11',
  light: 'mapbox/light-v10',
  dark: 'mapbox/dark-v10',
  satellite: 'mapbox/satellite-v9',
  satelliteStreet: 'mapbox/satellite-streets-v11',
};

function titleLayerFunc(styleID, API_KEY = API_KEY) {
  return new L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 4,
      id: styleID,
      tileSize: 512,
      zoomOffset: -1,
      accessToken: API_KEY,
    }
  );
}

let marker = L.marker([28.538336, -81.379234]);

let popup = L.popup()
  .setLatLng([28.538336, -81.379234])
  .setContent('I am a standalone popup.');

let map = L.map('map-single', {
  layers: [titleLayerFunc(mapboxStyles['dark'], API_KEY), marker, popup],
}).setView([28.538336, -81.379234], 15);

//
// Multiple Points
//

// An array containing each city's location, state, and population.
let cities = [
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

let mappedCities = cities.map((city) => {
  return new L.circleMarker(city.location, {
    radius: city.population / 200000,
    color: '#582159',
    fillColor: '#582159',
  }).bindPopup(
    '<h3>' +
      city.city +
      ', ' +
      city.state +
      '</h3> <hr> <h4>Population ' +
      city.population.toLocaleString() +
      '</h4>'
  );
});

let multiMap = L.map('map-multi', {
  layers: [
    titleLayerFunc(mapboxStyles['dark'], API_KEY),
    ...mappedCities,
    popup,
  ],
}).setView([28.538336, -81.379234], 15);

//
// Earthquakes & Plates
//

let eqMap = L.map('map-earthquakes', {
  layers: [titleLayerFunc(mapboxStyles['dark'], API_KEY)],
}).setView([28.538336, -81.379234], 15);

// A base layer that holds all wanted maps and needs to be refactored.
let baseMaps = {
  darks: titleLayerFunc(mapboxStyles['dark'], API_KEY),
  satelliteStreets: titleLayerFunc(mapboxStyles['satelliteStreet'], API_KEY),
  lights: titleLayerFunc(mapboxStyles['light'], API_KEY),
};

let earthquakes = new L.layerGroup();
let tectonicPlates = new L.layerGroup();
let majorEarthquakes = new L.layerGroup();

// We define an object that contains the overlays.
// This overlay will be visible all the time.
let overlays = {
  Earthquakes: earthquakes,
  TectonicPlates: tectonicPlates,
  MajorEarthquakes: majorEarthquakes,
};

// Then add a control to the map that will allow the user to change
// which layers are visible.
L.control.layers(baseMaps, overlays).addTo(eqMap);

$.getJSON(
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  function (data) {
    // This function returns the style data for each of the earthquakes we plot on
    // the map. We pass the magnitude of the earthquake into two separate functions
    // to calculate the color and radius.
    function styleInfo(feature) {
      return {
        opacity: 1,
        fillOpacity: 1,
        fillColor: getColor(feature.properties.mag),
        color: '#000000',
        radius: getRadius(feature.properties.mag),
        stroke: true,
        weight: 0.5,
      };
    }

    // This function determines the color of the circle based on the magnitude of the earthquake.
    function getColor(magnitude) {
      if (magnitude > 5) {
        return '#ffa600';
      }
      if (magnitude > 4) {
        return '#ff7c43';
      }
      if (magnitude > 3) {
        return '#f95d6a';
      }
      if (magnitude > 2) {
        return '#d45087';
      }
      if (magnitude > 1) {
        return '#a05195';
      }
      return '#665191';
    }

    // This function determines the radius of the earthquake marker based on its magnitude.
    // Earthquakes with a magnitude of 0 will be plotted with a radius of 1.
    function getRadius(magnitude) {
      return magnitude === 0 ? 1 : magnitude * 4;
    }

    // Creating a GeoJSON layer with the retrieved data.
    L.geoJson(data, {
      // We turn each feature into a circleMarker on the map.
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng);
      },

      // We set the style for each circleMarker using our styleInfo function.
      style: styleInfo,
      // We create a popup for each circleMarker to display the magnitude and
      //  location of the earthquake after the marker has been created and styled.
      onEachFeature: function (feature, layer) {
        layer.bindPopup(
          'Magnitude: ' +
            feature.properties.mag +
            '<br>Location: ' +
            feature.properties.place
        );
      },
    }).addTo(earthquakes);

    // Add Earthquake Layer to map
    earthquakes.addTo(eqMap);

    // Creating a GeoJSON layer with the retrieved data.
    $.getJSON(
      'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json',
      function (data) {
        L.geoJson(data, {
          color: '#2f4b7c',
          weight: 3,
          // We turn each tectonic plate into a line on the map.
          pointToLayer: function (plates, latlng) {
            return L.LineString(latlng);
          },
        }).addTo(tectonicPlates);

        tectonicPlates.addTo(eqMap);
      }
    );

    // Creating a GeoJSON layer with the retrieved data.
    $.getJSON(
      'https://raw.githubusercontent.com/josem279/Mapping_Earthquakes/main/4.5_week.geojson',
      function (data) {
        function styleInfo(feature) {
          return {
            opacity: 1,
            fillOpacity: 1,
            fillColor: getColor(feature.properties.mag),
            color: '#000000',
            radius: getRadius(feature.properties.mag),
            stroke: true,
            weight: 0.5,
          };
        }
        // 5. Change the color function to use three colors for the major earthquakes based on the magnitude of the earthquake.
        function getColor(magnitude) {
          if (magnitude > 5) {
            return '#ffa600';
          }
          if (magnitude > 4) {
            return '#ff7c43';
          }
          return '#f95d6a';
        }

        // 6. Use the function that determines the radius of the earthquake marker based on its magnitude.
        function getRadius(magnitude) {
          return magnitude === 0 ? 1 : magnitude * 4;
        }

        L.geoJson(data, {
          pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng);
          },
          style: styleInfo,
          onEachFeature: function (feature, layer) {
            layer.bindPopup(
              'Magnitude: ' +
                feature.properties.mag +
                '<br>Location: ' +
                feature.properties.place
            );
          },
        }).addTo(majorEarthquakes);

        majorEarthquakes.addTo(eqMap);
      }
    );

    // ------ Add legend to map THIS ISN'T WORKING, AND SHOULD IT BE HERE?----------
    let legend = L.control({ position: 'bottomright' });

    // Then add all the details for the legend.
    legend.onAdd = function () {
      let div = L.DomUtil.create('div', 'info legend');
      const magnitudes = [0, 1, 2, 3, 4, 5];
      const colors = [
        '#665191',
        '#a05195',
        '#d45087',
        '#f95d6a',
        '#ff7c43',
        '#ffa600',
      ];

      // Looping through our intervals to generate a label with a colored square for each interval.
      magnitudes.map((x) => {
        div.innerHTML +=
          "<i style='background: " +
          colors[x] +
          "'></i> " +
          magnitudes[x] +
          (magnitudes[x + 1] ? '&ndash;' + magnitudes[x + 1] + '<br>' : '+');
        return div;
      });
    };

    legend.addTo(eqMap);
  }
);

//
// Using ELG to search earthquakes
//

// const address = '4012 Central Florida Pkwy, Orlando, FL 32837';

// ELG.geocode()
//   .text(address)
//   .run((err, results, response) => {
//     console.log(results.results[0].latlng);
//     const { lat, lng } = results.results[0].latlng;
//     L.marker([lat, lng]).addTo(mymap).bindPopup(address).openPopup();
//   });

//
// UI JS
//

// Smooth scrolling using jQuery easing
$('a.js-scroll-trigger[href*="#"]:not([href="#"])').on('click', function () {
  if (
    location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') &&
    location.hostname == this.hostname
  ) {
    let target = $(this.hash);
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html, body').animate(
        {
          scrollTop: target.offset().top,
        },
        1000,
        'easeInOutExpo'
      );
      return false;
    }
  }
});

// Closes responsive menu when a scroll trigger link is clicked
$('.js-scroll-trigger').on('click', function () {
  $('.navbar-collapse').collapse('hide');
});

// Activate scrollspy to add active class to navbar items on scroll
$('body').scrollspy({
  target: '#sideNav',
});
