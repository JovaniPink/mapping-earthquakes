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
- A noindex legacy Tableau WDC 2.x compatibility page for older workbooks.

View the [deployed site](https://mapping-earthquakes.netlify.app/) or the
[Tableau visualization](https://public.tableau.com/profile/jovanipink#!/vizhome/MappingEarthquakes_16129898573230/MappingEarthquakes).

## Data sources

The browser loads GeoJSON directly from these external sources:

- [USGS all-earthquakes, past seven days](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson)
- [USGS magnitude 4.5+ earthquakes, past seven days](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson)

The USGS feeds update every minute and change independently of this repository.
Each request has a ten-second timeout, and the interface reports individual
layer failures while leaving healthy layers interactive.

Tectonic boundaries use the repository-owned
[`static/data/PB2002_boundaries.json`](./static/data/PB2002_boundaries.json)
snapshot instead of a runtime request to GitHub. It is structurally equal to the
current upstream GeoJSON and is bundled by Parcel as a versioned build asset.
The dataset comes from Hugo Ahlenius/Nordpil's conversion of Peter Bird's plate
model and is available under the Open Data Commons Attribution License. See
[`THIRD_PARTY_DATA.md`](./THIRD_PARTY_DATA.md) for provenance and attribution.

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

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the Parcel development server.               |
| `npm run build`        | Create an optimized production bundle in `dist/`.  |
| `npm run format:check` | Check source, workflow, and README formatting.     |
| `npm run test:unit`    | Test feed, styling, popup, and schema contracts.   |
| `npm run test:dist`    | Verify the generated data and JavaScript assets.   |
| `npm test`             | Run formatting, tests, build, and artifact checks. |

For a dependency-security check, run `npm audit --audit-level=low` after
`npm ci`.

## Project structure

```text
.
├── index.html                 # Page structure and metadata
├── resources/                # Images and reference data
├── static/data/               # Bundled tectonic-plate snapshot
├── static/js/app.js          # Leaflet maps and browser integration
├── static/js/earthquake-data.js # Feed URLs and testable data contracts
├── static/scss/app.scss      # Site styles
├── tests/                    # Node unit tests
├── THIRD_PARTY_DATA.md       # Dataset provenance and licensing
├── .parcelrc                 # Raw JSON asset pipeline
└── .github/workflows/api.yml # Install, formatting, and build checks
```

Leaflet renders the maps, OpenStreetMap supplies the default tiles, and optional
Mapbox styles are enabled when Parcel injects `API_KEY` at build time. Parcel
emits the local tectonic dataset as a content-addressed build asset. The browser
Fetch API loads each GeoJSON overlay independently with bounded request times.
External feed values are escaped before they are rendered in popup HTML.

## Validation and deployment

Pull requests are expected to pass `npm test` and
`npm audit --audit-level=low` on the Node version in `.nvmrc`. CI does not need
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

The default OpenStreetMap raster service is best-effort and has no SLA. The
browser uses the required HTTPS tile URL, visible attribution, normal browser
caching, and user-driven interactive viewing; it does not prefetch tiles. Review
the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
before adding automated map traversal, offline downloads, or material traffic.

### Legacy Tableau connector

[`wdc-usga-gov.html`](./wdc-usga-gov.html) remains available for older workbook
compatibility and now uses dependency-free Fetch with explicit Tableau error
reporting. Tableau documents the WDC 2.x framework as deprecated and recommends
the REST API Connector for supported current clients. Do not build new workbook
architecture on the legacy page; migration or removal requires a separate
owner-reviewed decision.

## Roadmap

- Add browser-level behavior tests for layer controls and partial-feed failures.
- Document and review any future tectonic-plate snapshot refresh as a licensed
  data update.
- Migrate legacy Tableau consumers to the REST API Connector, then remove the
  WDC 2.x compatibility page.
- Add a time-series control for scrubbing through earthquake dates.

## Contributing

Open an issue before making a large behavioral change. For pull requests, keep
changes focused and run `npm test` before requesting review.

## License

Licensed under the MIT License. See [LICENSE.md](./LICENSE.md).
