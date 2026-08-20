# Third-party data

## USGS significant-earthquake fallback

[`static/data/significant_month.geojson`](./static/data/significant_month.geojson)
is a repository-owned fallback snapshot of the official
[USGS significant-earthquakes, past 30 days feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson).
It is used only when the complete live monthly feed cannot be reached and is
identified in the interface as a narrower fallback, never as a complete or
current event set.

[`static/data/significant_month.meta.json`](./static/data/significant_month.meta.json)
is the snapshot receipt. It records the source URL, retrieval time, source
generation time, feature count, and SHA-256 digest of the exact GeoJSON bytes.
Run `npm run data:refresh` for an intentional refresh and review both generated
files together.

## PB2002 tectonic plate boundaries

The file [`static/data/PB2002_boundaries.json`](./static/data/PB2002_boundaries.json)
is a repository-owned snapshot of the GeoJSON published in
[`fraxen/tectonicplates`](https://github.com/fraxen/tectonicplates/blob/master/GeoJSON/PB2002_boundaries.json).
The checked-in snapshot and the current upstream file contain the same 241
GeoJSON features; their serialized number formatting differs.

The upstream repository describes the data as Hugo Ahlenius/Nordpil's conversion
of the dataset from Peter Bird's 2003 paper, “An updated digital model of plate
boundaries,” with GeoJSON preparation credited to Christopher Sterling.

The collection is licensed under the
[Open Data Commons Attribution License 1.0](https://opendatacommons.org/licenses/by/1-0/).
Retain this notice and the visible application attribution when copying,
redistributing, or refreshing the dataset.
