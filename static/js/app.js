// Import config
import { API_KEY } from './config.js';

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
import 'leaflet-draw';
import * as ELG from 'esri-leaflet-geocoder';

// Single Point
let mapboxTiles = L.tileLayer(
  'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
  {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/dark-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: API_KEY,
  }
);

let marker = L.marker([28.538336, -81.379234]);

let popup = L.popup()
  .setLatLng([28.538336, -81.379234])
  .setContent('I am a standalone popup.');

let map = L.map('map-single', { layers: [mapboxTiles, marker, popup] }).setView(
  [28.538336, -81.379234],
  15
);

const address = '4012 Central Florida Pkwy, Orlando, FL 32837';

// ELG.geocode()
//   .text(address)
//   .run((err, results, response) => {
//     console.log(results.results[0].latlng);
//     const { lat, lng } = results.results[0].latlng;
//     L.marker([lat, lng]).addTo(mymap).bindPopup(address).openPopup();
//   });

// Multiple Points
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

let multiMap = L.map('map-multi').setView([40.7, -94.5], 4);

let multiMapboxTiles = L.tileLayer(
  'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
  {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/dark-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: API_KEY,
  }
);

cities.forEach(function (city) {
  L.circleMarker(city.location, {
    radius: city.population / 200000,
    color: '#582159',
    fillColor: '#582159',
  })
    .bindPopup(
      '<h3>' +
        city.city +
        ', ' +
        city.state +
        '</h3> <hr> <h4>Population ' +
        city.population.toLocaleString() +
        '</h4>'
    )
    .addTo(multiMap);
});

multiMapboxTiles.addTo(multiMap);

// UI JS
// Smooth scrolling using jQuery easing
$('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function () {
  if (
    location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') &&
    location.hostname == this.hostname
  ) {
    var target = $(this.hash);
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
$('.js-scroll-trigger').click(function () {
  $('.navbar-collapse').collapse('hide');
});

// Activate scrollspy to add active class to navbar items on scroll
$('body').scrollspy({
  target: '#sideNav',
});
