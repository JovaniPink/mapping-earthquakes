// Import Bootstrap
import 'bootstrap';

// Importing the custom scss
import '../scss/style.scss';

// Leaflet CSS
import '../../node_modules/leaflet/dist/leaflet.css';
import '../../node_modules/leaflet-draw/dist/leaflet.draw.css';

// Importing D3
// We do not have to import D3 because Plotly has it available.
import * as d3 from '../../node_modules/d3/dist/d3.js';

// Importing Leaflet
import * as L from '../../node_modules/leaflet/dist';
import 'leaflet-draw';

// Create the map object with a center and zoom level.
let map = L.map('mapid', {
  center: [40.7, -94.5],
  zoom: 4,
});
