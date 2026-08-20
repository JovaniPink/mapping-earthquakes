# Earthquake Atlas

Earthquake Atlas is a full-screen observed-data explorer for the latest month of
earthquakes reported by the U.S. Geological Survey. It pairs a MapLibre globe
with search, magnitude and depth filters, a 30-day timeline, tectonic plate
boundaries, and source-linked event details.

The primary route is an atlas, not a forecast or simulation. Every earthquake
shown comes from an official USGS feed or from a clearly labeled, narrower USGS
fallback snapshot.

View the [deployed site](https://mapping-earthquakes.netlify.app/). The existing
deployment will not contain this redesign until its pull request is reviewed,
merged, and deployed.

## Experience

- A true edge-to-edge dark map with floating, responsive controls.
- Live status based on the USGS feed's own generation timestamp.
- Search plus magnitude, depth, observation-window, and observed-through-date
  controls over one shared event collection.
- A magnitude-weighted heat field, world-scale clusters, event points, and a
  separate tectonic-boundary layer.
- A deterministic `Focus strongest` action and a source-linked event detail
  sheet.
- Globe and Mercator projections, full-screen map controls, and reduced-motion
  behavior.
- An explicitly labeled significant-events fallback when the complete live
  monthly feed cannot be reached.

The product and interaction decisions are recorded in
[`docs/FULLSCREEN_ATLAS_PLAN.md`](./docs/FULLSCREEN_ATLAS_PLAN.md). The legacy
Tableau WDC 2.x compatibility page remains separately available at
[`wdc-usga-gov.html`](./wdc-usga-gov.html); it is not part of the primary atlas
experience.

## Data and maps

The runtime requests the official
[USGS all-earthquakes, past 30 days GeoJSON feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson).
USGS says its real-time GeoJSON feeds are the preferred source for automated
displays and that they update every minute. The request has a ten-second timeout
and the payload is schema-checked before any feature reaches the map or metrics.
Missing required coordinates, depth, magnitude, or time values are rejected;
missing optional observations such as felt-report counts remain unknown rather
than being presented as zero.

The one-minute background refresh preserves the visitor's filters and timeline
position. If USGS revises an event with the same ID, an open detail sheet is
rebound to the latest accepted feature instead of retaining stale values.

If that request fails, the app loads the repository-owned
[`significant_month.geojson`](./static/data/significant_month.geojson) snapshot.
Its companion
[`significant_month.meta.json`](./static/data/significant_month.meta.json)
records the exact source URL, retrieval time, USGS generation time, feature
count, and SHA-256 digest. This fallback covers significant events only and is
labeled that way in the interface. Before displaying fallback claims, the
runtime cross-checks its source URL, generation and retrieval times, feature
count, and digest shape against the bundled collection. The test gate verifies
the SHA-256 digest against the exact committed bytes.

Tectonic boundaries use the repository-owned
[`PB2002_boundaries.json`](./static/data/PB2002_boundaries.json) snapshot. The
browser never retrieves this data from GitHub at runtime. See
[`THIRD_PARTY_DATA.md`](./THIRD_PARTY_DATA.md) for provenance and attribution.

[OpenFreeMap](https://openfreemap.org/) supplies the no-key vector style and
MapLibre GL JS renders the map. Their required OpenMapTiles and OpenStreetMap
attributions, plus the MapLibre renderer credit, remain visible in the Atlas
layer panel.

## Requirements

- Node.js 24 (see [`.nvmrc`](./.nvmrc))
- npm 11

No API key or secret is required.

## Local development

```sh
nvm use
npm ci
npm run dev
```

Parcel prints the local development URL after it starts.

## Commands

| Command                | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Start the Parcel development server.                           |
| `npm run build`        | Create an optimized production bundle in `dist/`.              |
| `npm run data:refresh` | Refresh the labeled USGS significant-month fallback + receipt. |
| `npm run format:check` | Check source, workflow, data metadata, tests, and docs.        |
| `npm run test:unit`    | Test data, evidence, filtering, and HTML contracts.            |
| `npm run test:dist`    | Verify the generated data and JavaScript assets.               |
| `npm run test:browser` | Exercise the built Atlas against offline browser fixtures.     |
| `npm test`             | Run formatting, unit tests, build, and artifact checks.        |

Refreshing the snapshot is an intentional source update. Review both generated
files and their receipt before committing them:

```sh
npm run data:refresh
git diff -- static/data/significant_month.geojson static/data/significant_month.meta.json
```

For a dependency-security check, run `npm audit --audit-level=low` after
`npm ci`.

Browser tests intercept the live USGS feed and external basemap with committed,
offline fixtures. They start a local server on port 4173 by default; use one
shared override when that port is occupied:

```sh
ATLAS_TEST_PORT=44173 npm run test:browser
```

## Project structure

```text
.
├── docs/FULLSCREEN_ATLAS_PLAN.md     # Product, data, and validation plan
├── index.html                        # Accessible full-screen shell
├── scripts/refresh-usgs-snapshot.mjs # Bounded USGS refresh + SHA-256 receipt
├── static/data/                      # Bundled fallback and tectonic snapshots
├── static/js/app.js                  # MapLibre runtime and UI interactions
├── static/js/earthquake-data.js      # Pure data and evidence contracts
├── static/scss/app.scss              # Full-screen responsive presentation
├── tests/                            # Unit, artifact, and offline browser contracts
├── THIRD_PARTY_DATA.md               # Dataset provenance and licensing
└── .github/workflows/api.yml         # Install, test, build, and audit checks
```

## Validation and deployment

Pull requests are expected to pass `npm test` and
`npm audit --audit-level=low` on the Node version in `.nvmrc`. The production
bundle includes the tectonic and significant-event fallback files. A successful
build proves that the application compiles; it does not prove that the live
USGS feed or the external basemap is currently reachable.

For a static host such as Netlify, use:

- Build command: `npm run build`
- Publish directory: `dist`

### Legacy Tableau connector

[`wdc-usga-gov.html`](./wdc-usga-gov.html) remains available for older workbook
compatibility and uses dependency-free Fetch with explicit Tableau error
reporting. Tableau documents WDC 2.x as deprecated and recommends its REST API
Connector for supported current clients. Do not build new workbook architecture
on the legacy page; migration or removal requires a separate owner-reviewed
decision.

## Roadmap

- Extend browser coverage to clustered map selection and layer visibility.
- Add ShakeMap intensity products as a separately sourced observed-data layer.
- Keep any future hypothetical earthquake and response-agent experience in a
  separately labeled Signal Room simulation rather than mixing it with this
  observed-data atlas.

## Contributing

Open an issue before making a large behavioral change. Keep pull requests
focused and run `npm test` before requesting review.

## License

Licensed under the MIT License. See [LICENSE.md](./LICENSE.md).
