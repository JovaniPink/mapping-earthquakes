export const ATLAS_TEST_HOST = '127.0.0.1';
export const DEFAULT_ATLAS_TEST_PORT = 4173;

export function getAtlasTestPort(value = process.env.ATLAS_TEST_PORT) {
  const port =
    value == null || value === '' ? DEFAULT_ATLAS_TEST_PORT : Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error('ATLAS_TEST_PORT must be an integer from 1 through 65535');
  }
  return port;
}

export function getAtlasTestOrigin(value = process.env.ATLAS_TEST_PORT) {
  return `http://${ATLAS_TEST_HOST}:${getAtlasTestPort(value)}`;
}

export const atlasTestPort = getAtlasTestPort();
export const atlasTestOrigin = getAtlasTestOrigin();
