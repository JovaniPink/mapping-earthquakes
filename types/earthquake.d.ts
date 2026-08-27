import type { Feature, FeatureCollection, Point } from 'geojson';

export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red';
export type DepthBucket =
  'all' | 'shallow' | 'intermediate' | 'deep' | 'unknown';
export type FeedMode = 'loading' | 'live' | 'fallback';

export interface EarthquakeProperties {
  alert: AlertLevel | null;
  depth: number;
  felt: number | null;
  mag: number;
  magType: string;
  place: string;
  sig: number;
  sourceUrl: string | null;
  status: string;
  time: number;
  title: string;
  tsunami: boolean;
  updated: number | null;
}

export interface EarthquakePoint extends Point {
  coordinates: [number, number, number];
}

export interface EarthquakeFeature extends Feature<
  EarthquakePoint,
  EarthquakeProperties
> {
  id: string;
}

export interface EarthquakeCollectionMetadata {
  acceptedCount: number;
  generated: number;
  rejectedCount: number;
  sourceCount: number;
  title: string;
}

export interface EarthquakeFeatureCollection extends FeatureCollection<
  EarthquakePoint,
  EarthquakeProperties
> {
  features: EarthquakeFeature[];
  metadata: EarthquakeCollectionMetadata;
}

export interface RawFeatureCollection {
  features: unknown[];
  metadata?: unknown;
  type: 'FeatureCollection';
}

export interface FallbackReceipt {
  [key: string]: unknown;
  coverage?: string;
  featureCount: number;
  generatedAt: string;
  retrievedAt: string;
  sha256: string;
  source?: string;
  sourceUrl: string;
}

export interface FeatureFilters {
  depth?: Exclude<DepthBucket, 'unknown'>;
  endTime?: number;
  minMagnitude?: number;
  query?: string;
  startTime?: number;
}

export interface JsonResponse {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}

export type JsonRequest = (
  url: string | URL,
  init?: RequestInit
) => Promise<JsonResponse>;
