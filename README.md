# Mapping Earthquakes

An interactive Leaflet project for exploring recent earthquakes, major events,
and tectonic plate boundaries alongside smaller map demonstrations.

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
- [Magnitude 4.5+ earthquake fixture](https://github.com/josem279/Mapping_Earthquakes/blob/main/4.5_week.geojson)

The USGS feed changes independently of this repository. The two community-hosted
GeoJSON files are external dependencies and may move or become unavailable.

## Requirements

- Node.js 24 (see [`.nvmrc`](./.nvmrc))
- npm 11
- A Mapbox public access token

The `API_KEY` value is compiled into browser JavaScript, so it is visible to site
visitors. Use a separate, URL-restricted public token with only the scopes needed
to read styles and tiles. Never use a secret-scoped token in this project. See
[Mapbox access-token guidance](https://docs.mapbox.com/accounts/guides/tokens/).

## Local development

```sh
nvm use
export API_KEY=pk.your_public_mapbox_token
npm ci
npm run dev
```

Parcel prints the local development URL after it starts.

## Commands

| Command                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Start the Parcel development server.              |
| `npm run build`        | Create an optimized production bundle in `dist/`. |
| `npm run format:check` | Check source, workflow, and README formatting.    |
| `npm test`             | Run the formatting check and production build.    |

For a dependency-security check, run `npm audit --audit-level=low` after
`npm ci`.

## Project structure

```text
.
├── index.html                 # Page structure and metadata
├── resources/                # Images and reference data
├── static/js/app.js          # Leaflet maps, layers, and data loading
├── static/scss/app.scss      # Site styles
└── .github/workflows/api.yml # Install, formatting, and build checks
```

Parcel injects `API_KEY` into `static/js/app.js` at build time. Leaflet renders
the maps, Mapbox supplies base-map tiles, and jQuery loads the GeoJSON overlays.

## Validation and deployment

Pull requests are expected to pass `npm test` on the Node version in `.nvmrc`.
The GitHub Actions workflow requires an `API_KEY` repository secret because the
production build resolves the Mapbox token.

For a static host such as Netlify, use:

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `API_KEY` set to the restricted public Mapbox token

The application depends on live third-party tile and GeoJSON requests. A
successful build proves that the bundle compiles; it does not prove those
external services are currently reachable.

## Roadmap

- Add automated behavior tests for layer controls and data rendering.
- Replace the community-hosted major-earthquake fixture with a maintained live
  source or a versioned local fixture.
- Add a time-series control for scrubbing through earthquake dates.

## Contributing

Open an issue before making a large behavioral change. For pull requests, keep
changes focused and run `npm test` before requesting review.

## License

Licensed under the MIT License. See [LICENSE.md](./LICENSE.md).
