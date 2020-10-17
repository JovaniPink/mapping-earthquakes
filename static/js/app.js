// Leaflet CSS
import '../../node_modules/leaflet/dist/leaflet.css';
import '../../node_modules/leaflet-draw/dist/leaflet.draw.css';

// Importing Leaflet
import L from 'leaflet';
import 'leaflet-draw';
import * as ELG from 'esri-leaflet-geocoder';

// Import config
import { API_KEY } from './config.js';

// Importing jQuery
import $ from 'jquery';

// Import Bootstrap
import 'bootstrap';

// Importing the custom scss
import '../scss/style.scss';

// FAB Button
$(function () {
  $('.btn-group-fab').on('click', '.btn', function () {
    $('.btn-group-fab').toggleClass('active');
  });
  $('has-tooltip').tooltip();
});

// https://docs.mapbox.com/api/maps/#static-images
let mapboxTiles = L.tileLayer(
  'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=' +
    API_KEY,
  {
    attribution:
      '© <a href="https://www.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    tileSize: 512,
    zoomOffset: -1,
  }
);

let map = L.map('mapid')
  .addLayer(mapboxTiles)
  .setView([28.538336, -81.379234], 15);

const address = '380 New York St, Redlands, California, 92373';

// ELG.geocode()
//   .text(address)
//   .run((err, results, response) => {
//     console.log(results.results[0].latlng);
//     const { lat, lng } = results.results[0].latlng;
//     L.marker([lat, lng]).addTo(mymap).bindPopup(address).openPopup();
//   });
