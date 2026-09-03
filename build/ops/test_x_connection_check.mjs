#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildOAuthHeader, credentialsFromEnv, verifyXConnection } from './x_connection_check.mjs';

const credentials = {
  consumerKey: 'consumer-key',
  consumerSecret: 'consumer-secret',
  accessToken: 'access-token',
  accessTokenSecret: 'access-token-secret'
};

assert.throws(() => credentialsFromEnv({}), /Missing required X API secrets/);
assert.deepEqual(credentialsFromEnv({
  FEEEYE_X_CONSUMER_KEY: credentials.consumerKey,
  FEEEYE_X_CONSUMER_SECRET: credentials.consumerSecret,
  FEEEYE_X_ACCESS_TOKEN: credentials.accessToken,
  FEEEYE_X_ACCESS_TOKEN_SECRET: credentials.accessTokenSecret
}), credentials);

const header = buildOAuthHeader(credentials, { nonce: 'fixed-nonce', timestamp: 1_700_000_000 });
assert.match(header, /^OAuth /);
assert.match(header, /oauth_signature_method="HMAC-SHA1"/);
assert.match(header, /oauth_signature=/);
assert.doesNotMatch(header, /consumer-secret|access-token-secret/);

let requested;
const successFetch = async (url, options) => {
  requested = { url, options };
  return { ok: true, status: 200, json: async () => ({ data: { id: '33391143', username: 'FeeEyeOfficial' } }) };
};
const result = await verifyXConnection(credentials, { fetchImpl: successFetch, nonce: 'fixed-nonce', timestamp: 1_700_000_000 });
assert.deepEqual(result, { connected: true, username: '@FeeEyeOfficial', read_only_check: true, post_created: false });
assert.equal(requested.url, 'https://api.x.com/2/users/me');
assert.equal(requested.options.method, 'GET');
assert.match(requested.options.headers.Authorization, /^OAuth /);

await assert.rejects(
  verifyXConnection(credentials, { expectedUsername: 'FeeEyeOfficial', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ data: { username: 'DifferentAccount' } }) }) }),
  /account mismatch/
);
await assert.rejects(
  verifyXConnection(credentials, { fetchImpl: async () => ({ ok: false, status: 401 }) }),
  /HTTP 401.*No post was created/
);

console.log('[OK] X connection check: OAuth 1.0a signing, exact account binding, read-only request, and secret-safe failures.');
