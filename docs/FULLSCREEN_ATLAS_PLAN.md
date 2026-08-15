# Full-screen Earthquake Atlas plan

Status: approved implementation plan for `agent/fullscreen-earthquake-atlas`

Base: `agent/modernize-mapping-dependencies` at `26bab634dfdf5181eac351915d130ad1dc48ff54`

## Product decision

The primary route becomes one full-viewport observed-data explorer. The old sequence of tutorial maps and the embedded Tableau view leave the primary experience. The legacy Tableau WDC remains a separately labeled compatibility route until its consumers can be reviewed.

This is **Earthquake Atlas**, not a disaster simulation. It displays USGS observations and a bundled tectonic-boundary reference. Hypothetical ShakeMap scenarios and agent-based response modeling belong in a future, explicitly labeled Signal Room product.

## Reference analysis

[Castle Map](https://thecastlemap.com/) is the interaction reference, not a visual template to copy. Its useful patterns are:

- a true edge-to-edge night map rather than a map embedded in a page;
- compact translucent controls that float above the geography;
- search, filters, summary counts, and discovery actions in one hierarchy;
- progressive disclosure: the detail card exists only after selection;
- restrained map chrome and visible data/basemap attribution; and
- direct, contextual links from a selected feature to its source record.

Earthquake Atlas adapts those patterns to temporal scientific data. Its identity uses a seismograph-line mark, mineral neutrals, magnitude heat colors, tighter technical typography, a bottom time instrument, and USGS-first provenance.

## Data contract

Primary source:

- `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson`
- USGS identifies the real-time GeoJSON feeds as the preferred source for automated earthquake displays.
- The feed is updated every minute; the application reports the feed's own `metadata.generated` value instead of substituting browser time.

Fallback source:

- a repository-owned snapshot of the official USGS significant-earthquakes, past-month feed;
- refreshed by an explicit script and committed with source URL, retrieval time, USGS generation time, feature count, and SHA-256 metadata; and
- labeled `Fallback snapshot` everywhere it is shown. It must never masquerade as a complete or current monthly feed.

Reference overlay:

- the bundled PB2002 tectonic-boundary GeoJSON snapshot already documented in `THIRD_PARTY_DATA.md`;
- no runtime GitHub fetch; and
- attribution preserved in the map and repository documentation.

The unlabeled 2020 monthly and malformed weekly snapshots are removed from the shipped application.

## Technical architecture

- Parcel 2 remains the application bundler established by PR #159.
- MapLibre GL JS replaces Leaflet and Bootstrap on the primary route.
- OpenFreeMap's dark vector style is the no-key default basemap.
- One GeoJSON source feeds three zoom-aware layers:
  - clusters at world scale;
  - a magnitude-weighted heatmap below regional zoom; and
  - magnitude/depth encoded circles for inspectable events.
- Tectonic boundaries remain a separate line layer.
- Pure functions own normalization, filtering, search, timeline bounds, metrics, freshness, and safe source-link validation.
- The interface updates a single filtered GeoJSON source; results and visible summary values come from the same feature set.

## Experience anatomy

### Persistent

- full-screen map and atmosphere;
- top-left atlas panel with product identity, feed status, search, summary, and collapse control;
- top-right map controls for navigation, fullscreen, and globe/mercator mode;
- lower-right magnitude legend and layer menu;
- bottom timeline instrument with start/end date, play/pause, and 30-day scrubber; and
- explicit USGS, tectonic-data, MapLibre, OpenFreeMap, OpenMapTiles, and OpenStreetMap attribution.

### On demand

- magnitude, depth, and time filters;
- heatmap, event, and tectonic-boundary toggles;
- `Focus strongest` action that selects the strongest event inside the current filter window;
- hover readout for pointer users;
- event detail sheet with magnitude, place, local-neutral UTC time, depth, review status, significance, felt reports, tsunami flag, alert level, coordinates, and official USGS link; and
- compact mobile bottom sheets that never make the map horizontally overflow.

## Accessibility and motion

- Every non-map action is a native button, input, link, or checkbox with a visible label.
- The canvas has an accessible name and the selected event is mirrored in semantic HTML.
- Focus treatment remains visible over translucent panels.
- The timeline is keyboard operable and exposes its selected date in text.
- `prefers-reduced-motion` disables fly transitions, pulsing markers, and automatic timeline playback.
- Color is never the only magnitude signal: radius and text labels carry the same meaning.

## Failure behavior

- Live feed success: show `Live USGS feed`, generation time, count, and the selected 30-day window.
- Live feed timeout or schema failure: use the bundled significant-event snapshot and identify its narrower coverage and retrieval time.
- Basemap failure: retain controls, event list/detail semantics, and a visible service message; do not claim map availability from a successful build.
- Empty filters: show a zero-result state and preserve controls; never silently widen the range.
- Invalid source URLs or malformed features: reject them from links/metrics and record a console warning without injecting markup.

## Validation gates

1. Formatting passes for source, tests, documentation, HTML, and workflow files.
2. Unit tests cover schema normalization, filtering, search, magnitude/depth buckets, timeline bounds, summaries, source-link allowlisting, live/fallback freshness labels, and deterministic focus selection.
3. HTML contract tests cover full-screen landmark structure, semantic controls, persistent evidence labels, and removal of tutorial/embedded-Tableau content from the primary route.
4. Production build bundles the MapLibre worker runtime, emits the tectonic and fallback snapshots, and contains no runtime GitHub URL.
5. Browser QA covers a desktop viewport and a narrow mobile viewport, pointer selection, keyboard timeline use, panel collapse, empty filters, and console errors.
6. `npm audit --audit-level=low` passes or any upstream advisory is recorded explicitly before publication.

## Pull request strategy

This is a stacked PR targeting `agent/modernize-mapping-dependencies`. That keeps PR #159's dependency/data-custody review intact and makes the full-screen product rewrite independently reviewable. After #159 merges, this branch can be rebased onto `main` and its PR base changed without mixing or recreating the modernization commits.
