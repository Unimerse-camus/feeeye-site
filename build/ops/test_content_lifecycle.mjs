#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContentRegistration, recordContentRegistration, loadContentRegistry, normalizeLandingUrl, slugFromUrl, registrationsFromDelta, EDITORIAL_PATH_PATTERN } from './content_registry.mjs';
import { reviewContentLifecycle, lifecycleMarkdown, lifecycleThreshold } from './content_lifecycle_review.mjs';
import { renderWeeklyReport } from './weekly_review.mjs';
import { writeEncryptedJson } from './private_data_crypto.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const key = crypto.randomBytes(32);
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'feeeye-lifecycle-'));
const write = (rel, body) => { const file = path.join(store, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); return file; };
const enc = (rel, value) => writeEncryptedJson(path.join(store, rel), value, key);
const entry = overrides => ({ schema_version: 1, content_id: 'site-learn-safe-transfer-en-2026-10-01', channel: 'site', landing_url: 'https://feeeye.com/learn/safe-crypto-transfer', published_at: '2026-10-01', checkpoints: ['7d', '28d'], source: 'postdeploy', registered_at: '2026-10-01T05:00:00.000Z', notes: [], ...overrides });

// Post-deploy workflow contract: registers editorial content to the ledger only.
const postdeploy = fs.readFileSync(path.join(root, '.github/workflows/postdeploy-bilingual.yml'), 'utf8');
assert.match(postdeploy, /content_registry\.mjs --register-deployment --store receipt-ledger/);
assert.match(postdeploy, /ref: automation-receipts/);
assert.match(postdeploy, /contents: write/);
assert.match(postdeploy, /group: x-receipt-ledger/);
assert.ok(postdeploy.includes('git push origin HEAD:automation-receipts'));
assert.ok(!postdeploy.includes('HEAD:main'));

// URL helpers.
assert.equal(normalizeLandingUrl('https://feeeye.com/learn/safe-crypto-transfer.html'), 'https://feeeye.com/learn/safe-crypto-transfer');
assert.equal(normalizeLandingUrl('https://feeeye.com/zh/'), 'https://feeeye.com/zh');
assert.equal(slugFromUrl('https://feeeye.com/zh/learn/safe-crypto-transfer.html'), 'zh-learn-safe-crypto-transfer');
assert.ok(EDITORIAL_PATH_PATTERN.test('/research/1000-usdt-spot-cost'));
assert.ok(EDITORIAL_PATH_PATTERN.test('/zh/learn/safe-crypto-transfer'));
assert.ok(!EDITORIAL_PATH_PATTERN.test('/where-to-buy/btc.html'));
assert.ok(!EDITORIAL_PATH_PATTERN.test('/tools/fee-calculator.html'));

// Registration schema and immutability.
validateContentRegistration(entry());
assert.throws(() => validateContentRegistration(entry({ channel: 'telegram' })), /Invalid content registration/);
assert.throws(() => validateContentRegistration(entry({ landing_url: 'http://feeeye.com/learn/safe-crypto-transfer' })), /Invalid landing URL/);
assert.throws(() => validateContentRegistration(entry({ landing_url: 'https://feeeye.com/learn/x?utm=x' })), /clean feeeye\.com/);
assert.throws(() => validateContentRegistration(entry({ checkpoints: ['7d'] })), /Invalid checkpoints/);
assert.equal(recordContentRegistration(store, entry()).created, true);
assert.equal(recordContentRegistration(store, entry()).created, false);
assert.throws(() => recordContentRegistration(store, entry({ notes: ['different'] })), /different immutable content/);
assert.throws(() => validateContentRegistration({ ...entry(), channel: 'youtube', content_id: 'yt-demo-2026-09-15', landing_url: 'http://youtu.be/abc' }), /Invalid landing URL/);
recordContentRegistration(store, entry({ channel: 'youtube', content_id: 'yt-safe-transfer-demo-2026-09-15', landing_url: 'https://www.youtube.com/watch?v=abc123', published_at: '2026-09-15', source: 'manual', registered_at: '2026-09-15T20:00:00.000Z' }));
recordContentRegistration(store, entry({ content_id: 'site-research-1000-usdt-en-2026-09-20', landing_url: 'https://feeeye.com/research/1000-usdt-spot-cost', published_at: '2026-09-20', registered_at: '2026-09-20T05:00:00.000Z' }));
assert.equal(loadContentRegistry(store).length, 3);
write('content-registry/orphan.json', JSON.stringify(entry({ content_id: 'different-id' })));
assert.throws(() => loadContentRegistry(store), /Registry path mismatch/);
fs.unlinkSync(path.join(store, 'content-registry/orphan.json'));

// Deployment delta → registrations: only editorial paths, created vs republished note, per-day idempotent ids.
const registrations = registrationsFromDelta({
  created: ['https://feeeye.com/zh/learn/first-spot-trade.html', 'https://feeeye.com/where-to-buy/btc.html'],
  changed: ['https://feeeye.com/research/1000-usdt-spot-cost.html', 'https://feeeye.com/tools/fee-calculator.html'],
  deleted: []
}, { today: '2026-10-26', registeredAt: '2026-10-26T05:00:00.000Z' });
assert.deepEqual(registrations.map(item => item.content_id), ['site-zh-learn-first-spot-trade-2026-10-26', 'site-research-1000-usdt-spot-cost-2026-10-26']);
assert.deepEqual(registrations[0].notes, []);
assert.deepEqual(registrations[1].notes, ['republished: content hash changed']);
assert.equal(registrationsFromDelta({ created: [], changed: [], deleted: [] }, { today: '2026-10-26', registeredAt: '2026-10-26T05:00:00.000Z' }).length, 0);

// Ledger fixtures: one X post (2026-09-03) with only its 7d metrics snapshot, plus a GSC page receipt.
const xKey = 'a'.repeat(64);
write(`x/${xKey}.json`, JSON.stringify({ schema_version: 1, request_id: 'transfer-en-69c3349c3ad2', idempotency_key: xKey, account: '@FeeEyeOfficial', post_url: 'https://x.com/FeeEyeOfficial/status/2095418661246800236', reconciled: false, post_created: true, recorded_at: '2026-09-03T07:48:34.062Z' }));
enc(`x-metrics/${xKey}/7d.json.enc`, {
  schema_version: 1, account: '@FeeEyeOfficial', request_id: 'transfer-en-69c3349c3ad2', idempotency_key: xKey,
  post_url: 'https://x.com/FeeEyeOfficial/status/2095418661246800236', checkpoint: '7d',
  due_at: '2026-09-10T07:48:34.062Z', observed_at: '2026-09-10T08:07:00.000Z', lag_minutes: 19,
  metrics: { impressions: 210, likes: 3, replies: 1, reposts: 0, quotes: 0, bookmarks: 1, engagements: 5, url_clicks: 40, profile_clicks: 2 }, missing_fields: []
});
enc('search/gsc/2026-10-16.json.enc', {
  schema_version: 1, window: { from: '2026-09-18', to: '2026-10-16' },
  coverage: { gsc: { status: 'complete', through: '2026-10-16', note_code: 'complete_aggregate_export' } },
  pages: [{ url: 'https://feeeye.com/learn/safe-crypto-transfer.html', clicks: 5, impressions: 120, average_position: 8.3 }]
});

// Lifecycle review against reference day 2026-10-18.
const report = reviewContentLifecycle({ store, key, to: '2026-10-18' });
const byId = Object.fromEntries(report.items.map(item => [item.content_id, item]));
assert.equal(report.items.length, 4);
const learn = byId['site-learn-safe-transfer-en-2026-10-01'];
assert.equal(learn.checkpoints.find(cp => cp.label === '7d').status, 'observed');
assert.equal(learn.checkpoints.find(cp => cp.label === '7d').metrics.clicks, 5); // matched through the .html variant
assert.equal(learn.checkpoints.find(cp => cp.label === '28d').status, 'pending');
const research = byId['site-research-1000-usdt-en-2026-09-20'];
assert.equal(research.checkpoints.find(cp => cp.label === '28d').status, 'observed');
assert.deepEqual(research.checkpoints.find(cp => cp.label === '28d').metrics, { clicks: 0, impressions: 0, average_position: null });
assert.match(research.checkpoints.find(cp => cp.label === '28d').note, /zero search impressions/);
const youtube = byId['yt-safe-transfer-demo-2026-09-15'];
assert.ok(youtube.checkpoints.every(cp => cp.status === 'manual'));
const post = byId[`x-${xKey.slice(0, 12)}`];
assert.equal(post.checkpoints.find(cp => cp.label === '7d').status, 'observed');
assert.equal(post.checkpoints.find(cp => cp.label === '7d').metrics.url_clicks, 40);
assert.equal(post.checkpoints.find(cp => cp.label === '28d').status, 'due_unreported');
assert.equal(lifecycleThreshold(post), true);
assert.equal(lifecycleThreshold(learn), false);
assert.equal(lifecycleThreshold(youtube), null);

// Markdown rendering and weekly report integration.
const markdown = lifecycleMarkdown(report);
assert.match(markdown, /## 内容生命周期/);
assert.match(markdown, /x-[a-f0-9]{12} \| x \| 2026-09-03 \| 7d \| observed ·达门槛/);
assert.match(markdown, /yt-safe-transfer-demo-2026-09-15 \| youtube \| 2026-09-15 \| 28d \| manual/);
const rendered = renderWeeklyReport({ store, to: '2026-10-18', key });
assert.match(rendered.markdown, /## 内容生命周期/);
assert.equal(rendered.summary.lifecycle_items, 4);
assert.equal(rendered.summary.lifecycle_due, 7); // 1 + 2 + 2 + 2 non-pending checkpoints

console.log('[OK] content lifecycle: registry immutability, editorial delta filtering, per-channel checkpoints, GSC variant matching, X snapshot lookup, threshold markers, and weekly report integration.');
