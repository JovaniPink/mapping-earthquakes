# Browser fixtures

`usgs-month.geojson` is a synthetic, test-only payload shaped like the public
USGS monthly GeoJSON feed. Its places and event IDs are deliberately labeled as
fixtures. It must never be copied into `static/data`, presented as an observed
earthquake record, or used to refresh the repository's provenance-backed USGS
fallback snapshot.

Browser tests intercept the live feed with these fixed bytes and replace the
remote basemap style with an empty local response. Any other external browser
request is recorded and aborted so the suite remains deterministic and
offline-safe.
