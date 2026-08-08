# Mapping Earthquakes

An interactive Leaflet project for exploring recent earthquakes, magnitude 4.5+
events, and tectonic plate boundaries alongside smaller map demonstrations.

![Earth viewed from space](./resources/earth.jpg)

Photo by [NASA](https://unsplash.com/@nasa) on
[Unsplash](https://unsplash.com/s/photos/earth-quakes).

## What the site includes

- A single-location Leaflet example centered on Orlando, Florida.
- A multi-city example whose marker size represents population.
- An earthquake map with selectable Mapbox base maps and overlay controls.
- Magnitude-sized and color-coded markers with location details in popups.
- Separate overlays for all earthquakes, major earthquakes, and tectonic plate
  boundaries.
- An embedded Tableau earthquake visualization.

View the [deployed site](https://mapping-earthquakes.netlify.app/) or the
[Tableau visualization](https://public.tableau.com/profile/jovanipink#!/vizhome/MappingEarthquakes_16129898573230/MappingEarthquakes).

## Data sources

The browser loads GeoJSON directly from these external sources:

- [USGS all-earthquakes, past seven days](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson)
- [Tectonic plate boundaries](https://github.com/fraxen/tectonicplates/blob/master/GeoJSON/PB2002_boundaries.json)
- [USGS magnitude 4.5+ earthquakes, past seven days](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson)

The USGS feeds update every minute and change independently of this repository.
The community-maintained tectonic-plate file may move or become unavailable;
the interface reports individual layer failures while leaving healthy layers
interactive.

## Requirements

- Node.js 24 (see [`.nvmrc`](./.nvmrc))
- npm 11
- An optional Mapbox public access token for the additional base-map styles

OpenStreetMap is the default base layer, so the application runs without a
Mapbox token. When supplied, the `API_KEY` value is compiled into browser
JavaScript and is visible to visitors. Use a separate, URL-restricted public
token with only the scopes needed to read styles and tiles. Never use a
secret-scoped token in this project. See
[Mapbox access-token guidance](https://docs.mapbox.com/accounts/guides/tokens/).

## Local development

```sh
nvm use
npm ci
npm run dev
```

To enable the optional Mapbox styles, copy `.env.example` to `.env` and replace
its placeholder token, or export `API_KEY` before starting Parcel. Parcel prints
the local development URL after it starts.

## Commands

| Command                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Start the Parcel development server.              |
| `npm run build`        | Create an optimized production bundle in `dist/`. |
| `npm run format:check` | Check source, workflow, and README formatting.    |
| `npm run test:unit`    | Test feed, styling, popup, and schema contracts.  |
| `npm test`             | Run formatting, unit tests, and production build. |

For a dependency-security check, run `npm audit --audit-level=low` after
`npm ci`.

## Project structure

```text
.
├── index.html                 # Page structure and metadata
├── resources/                # Images and reference data
├── static/js/app.js          # Leaflet maps and browser integration
├── static/js/earthquake-data.js # Feed URLs and testable data contracts
├── static/scss/app.scss      # Site styles
├── tests/                    # Node unit tests
└── .github/workflows/api.yml # Install, formatting, and build checks
```

Leaflet renders the maps, OpenStreetMap supplies the default tiles, and optional
Mapbox styles are enabled when Parcel injects `API_KEY` at build time. The
browser Fetch API loads each GeoJSON overlay independently. External feed values
are escaped before they are rendered in popup HTML.

## Validation and deployment

Pull requests are expected to pass `npm test` and
`npm audit --audit-level=high` on the Node version in `.nvmrc`. CI does not need
a Mapbox token because OpenStreetMap is the runtime fallback. Preview and
production hosts may provide a URL-restricted public token for the optional
Mapbox layers.

For a static host such as Netlify, use:

- Build command: `npm run build`
- Publish directory: `dist`
- Optional environment variable: `API_KEY` set to a restricted public Mapbox
  token

The application depends on live third-party tile and GeoJSON requests. A
successful build proves that the bundle compiles; it does not prove those
external services are currently reachable.

## Roadmap

- Add browser-level behavior tests for layer controls and partial-feed failures.
- Version the tectonic-plate data locally or move to a maintained authoritative
  source.
- Add a time-series control for scrubbing through earthquake dates.

## Contributing

Open an issue before making a large behavioral change. For pull requests, keep
changes focused and run `npm test` before requesting review.

## License

Licensed under the MIT License. See [LICENSE.md](./LICENSE.md).
