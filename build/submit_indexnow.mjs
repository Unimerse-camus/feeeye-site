#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemapPath = path.join(root, 'dist', 'sitemap.xml');
const keyPath = path.join(root, 'assets', 'indexnow-key.txt');
const host = 'feeeye.com';
const endpoint = 'https://api.indexnow.org/indexnow';

if (!fs.existsSync(sitemapPath)) throw new Error('dist/sitemap.xml is missing; run build/generate.mjs first');
if (!fs.existsSync(keyPath)) throw new Error('assets/indexnow-key.txt is missing');

const key = fs.readFileSync(keyPath, 'utf8').trim();
if (!/^[a-f0-9]{8,128}$/i.test(key)) throw new Error('IndexNow key must be 8-128 hexadecimal characters');
const xml = fs.readFileSync(sitemapPath, 'utf8');
const urls = [...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map((match) => match[1]);
if (!urls.length) throw new Error('No sitemap URLs found');
if (urls.length > 10000) throw new Error(`IndexNow batch exceeds 10,000 URLs: ${urls.length}`);
for (const url of urls) {
  const parsed = new URL(url);
  if (parsed.hostname !== host || parsed.protocol !== 'https:') throw new Error(`Unexpected sitemap URL: ${url}`);
}

const payload = {
  host,
  key,
  keyLocation: `https://${host}/assets/indexnow-key.txt`,
  urlList: urls
};

if (!process.argv.includes('--submit')) {
  console.log(`[OK] IndexNow dry run: ${urls.length} canonical URLs, keyLocation=${payload.keyLocation}`);
} else {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const body = await response.text();
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow submission failed (${response.status}): ${body.slice(0, 500)}`);
  console.log(`[OK] IndexNow accepted ${urls.length} URLs (HTTP ${response.status}).`);
}
