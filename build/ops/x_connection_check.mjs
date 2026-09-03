#!/usr/bin/env node
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const API_URL = 'https://api.x.com/2/users/me';
const REQUIRED_ENV = [
  'FEEEYE_X_CONSUMER_KEY',
  'FEEEYE_X_CONSUMER_SECRET',
  'FEEEYE_X_ACCESS_TOKEN',
  'FEEEYE_X_ACCESS_TOKEN_SECRET'
];

const encode = value => encodeURIComponent(String(value)).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

export function credentialsFromEnv(env = process.env) {
  const missing = REQUIRED_ENV.filter(name => !env[name]);
  if (missing.length) throw new Error(`Missing required X API secrets: ${missing.join(', ')}`);
  return {
    consumerKey: env.FEEEYE_X_CONSUMER_KEY,
    consumerSecret: env.FEEEYE_X_CONSUMER_SECRET,
    accessToken: env.FEEEYE_X_ACCESS_TOKEN,
    accessTokenSecret: env.FEEEYE_X_ACCESS_TOKEN_SECRET
  };
}

export function buildOAuthHeader(credentials, { method = 'GET', url = API_URL, nonce = crypto.randomBytes(18).toString('hex'), timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const parsed = new URL(url);
  const baseUrl = `${parsed.origin}${parsed.pathname}`;
  const oauth = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0'
  };
  const parameters = [...parsed.searchParams.entries(), ...Object.entries(oauth)]
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([ak, av], [bk, bv]) => ak === bk ? av.localeCompare(bv) : ak.localeCompare(bk));
  const normalized = parameters.map(([key, value]) => `${key}=${value}`).join('&');
  const base = `${method.toUpperCase()}&${encode(baseUrl)}&${encode(normalized)}`;
  const signingKey = `${encode(credentials.consumerSecret)}&${encode(credentials.accessTokenSecret)}`;
  oauth.oauth_signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  return `OAuth ${Object.entries(oauth).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}="${encode(value)}"`).join(', ')}`;
}

export async function verifyXConnection(credentials, { expectedUsername = 'FeeEyeOfficial', fetchImpl = fetch, nonce, timestamp } = {}) {
  const response = await fetchImpl(API_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: buildOAuthHeader(credentials, { nonce, timestamp })
    },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`X API connection failed (HTTP ${response.status}). No post was created.`);
  const payload = await response.json();
  const username = payload?.data?.username;
  if (!username) throw new Error('X API response did not identify the authenticated account.');
  if (username.toLowerCase() !== expectedUsername.toLowerCase()) throw new Error(`Authenticated X account mismatch: expected @${expectedUsername}, received @${username}.`);
  return { connected: true, username: `@${username}`, read_only_check: true, post_created: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const index = args.indexOf('--expected-username');
  const expectedUsername = index >= 0 ? args[index + 1] : 'FeeEyeOfficial';
  if (!/^[A-Za-z0-9_]{1,15}$/.test(expectedUsername || '')) throw new Error('Invalid --expected-username value.');
  const result = await verifyXConnection(credentialsFromEnv(), { expectedUsername });
  console.log(JSON.stringify(result));
}
