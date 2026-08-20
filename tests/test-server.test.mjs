import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_ATLAS_TEST_PORT,
  getAtlasTestOrigin,
  getAtlasTestPort,
} from './support/test-server.mjs';

test('uses one validated browser-test server contract', () => {
  assert.equal(getAtlasTestPort(null), DEFAULT_ATLAS_TEST_PORT);
  assert.equal(getAtlasTestPort('44173'), 44_173);
  assert.equal(getAtlasTestOrigin('44173'), 'http://127.0.0.1:44173');

  for (const invalid of ['0', '65536', '4.5', 'not-a-port']) {
    assert.throws(() => getAtlasTestPort(invalid), /ATLAS_TEST_PORT/);
  }
});
