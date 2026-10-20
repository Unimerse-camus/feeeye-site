#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weekLabel, weekWindow, assembleWeeklyInput, renderWeeklyReport, stageManualSupplement, validateManualSupplement } from './weekly_review.mjs';
import { readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const key = crypto.randomBytes(32);
const envKey = key.toString('base64');
const DAY = 86_400_000;
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'feeeye-weekly-'));
const write = (rel, body) => { const file = path.join(store, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); return file; };
const enc = (rel, value) => writeEncryptedJson(path.join(store, rel), value, key);

// Workflow contract: scheduled, ledger-gated, never publishes to main.
const workflow = fs.readFileSync(path.join(root, '.github/workflows/weekly-review.yml'), 'utf8');
assert.match(workflow, /cron: '47 4 \* \* 1'/);
assert.match(workflow, /vars\.FEEEYE_WEEKLY_REVIEW == 'enabled'/);
assert.match(workflow, /ref: automation-receipts/);
assert.match(workflow, /concurrency:\s*\n\s*group: x-receipt-ledger/);
assert.ok(!workflow.includes('git push origin HEAD:main'));
assert.ok(!workflow.includes('origin/main'));
// Structural guard: every checkout step must pass ref/path via with:, otherwise the
// workflow file fails to parse and its schedule never registers.
const checkoutBlocks = workflow.split('- name:').filter(block => block.includes('uses: actions/checkout@'));
assert.ok(checkoutBlocks.length >= 2);
for (const block of checkoutBlocks) assert.match(block.replace(/\n\s+- name:.*$/s, ''), /with:\s*\n\s+ref:/);

// Window helpers: 2026-10-18 is a Sunday inside ISO week 42.
assert.deepEqual(weekWindow('2026-10-18'), { from: '2026-10-12', to: '2026-10-18' });
assert.equal(weekLabel('2026-10-18'), '2026-W42');
assert.throws(() => weekWindow('2026-10-19T00:00:00Z'));

const TO = '2026-10-18', FROM = '2026-10-12';

// Seed ledger: GSC trailing aggregate, Cloudflare daily series, one X publish receipt, X analysis.
enc('search/gsc/2026-10-16.json.enc', {
  schema_version: 1,
  window: { from: '2026-09-19', to: '2026-10-16' },
  coverage: { gsc: { status: 'complete', through: '2026-10-16', note_code: 'complete_aggregate_export' } },
  pages: [
    { url: 'https://feeeye.com/zh/', clicks: 4, impressions: 71, average_position: 4.2 },
    { url: 'https://feeeye.com/', clicks: 6, impressions: 120, average_position: 6.1 }
  ]
});
const cfDays = [];
for (let at = Date.parse('2026-09-22'); at <= Date.parse('2026-10-17'); at += DAY) {
  const date = new Date(at).toISOString().slice(0, 10);
  cfDays.push({ date, page_views: 10, visits: 9, sources: { direct: 4, search: 3, ai: 1, social: 1, self: 0, other: 0 }, performance: {}, web_vitals: {} });
}
enc('analytics/cloudflare/2026-10-17.json.enc', { schema_version: 1, window: { from: '2026-09-20', to: '2026-10-17' }, coverage: { cloudflare: { status: 'partial', through: '2026-10-17', note_code: 'eu_excluded_web_analytics' } }, daily: cfDays, totals: { page_views: 0, visits: 0, sources: {} } });
write(`x/${'a'.repeat(64)}.json`, JSON.stringify({ schema_version: 1, request_id: 'transfer-en-69c3349c3ad2', idempotency_key: 'a'.repeat(64), account: '@FeeEyeOfficial', post_url: 'https://x.com/FeeEyeOfficial/status/2095418661246800236', reconciled: false, post_created: true, recorded_at: '2026-10-13T07:48:34.062Z' }));
enc(`x-analysis/${'b'.repeat(64)}.json.enc`, {
  schema_version: 1, status: 'analyzed', analysis_id: 'b'.repeat(64), decision: 'observe', reason: 'waiting_for_28d_checkpoint',
  cadence_multiplier: 1, automatic_publish_allowed: false, snapshot_count: 2, post_count: 1, completed_28d_samples: 0,
  facts: [{ post_url: 'https://x.com/FeeEyeOfficial/status/2095418661246800236', request_id: 'transfer-en-69c3349c3ad2', latest_checkpoint: '7d', observed_at: '2026-10-10T08:07:00.000Z', metrics: { impressions: 210, likes: 3, replies: 1, reposts: 0, quotes: 0, bookmarks: 1, engagements: 5, url_clicks: 7, profile_clicks: 2 }, missing_fields: [] }]
});

// Assemble without manual supplement: sources fill, affiliate stays null, nothing becomes zero.
let input = assembleWeeklyInput({ store, to: TO, key });
assert.equal(input.metrics.search_clicks, 10);
assert.equal(input.metrics.search_impressions, 191);
assert.equal(input.metrics.site_visits, 54); // 6 of 7 report days covered by the receipt (through 10-17)
assert.equal(input.metrics.ai_referral_visits, 6);
assert.equal(input.metrics.x_posts_published, 1);
assert.equal(input.metrics.x_link_clicks, 7);
assert.equal(input.metrics.affiliate_clicks, null);
assert.equal(input.metrics.human_hours, null);
assert.equal(input.coverage.gsc.status, 'partial');
assert.match(input.coverage.gsc.note, /Trailing 28-day/);
assert.equal(input.coverage.cloudflare.status, 'partial');
assert.equal(input.coverage.cloudflare.through, '2026-10-17');
assert.match(input.coverage.cloudflare.note, /6\/7 report days/);
assert.ok(input.notes.some(note => /overlaps only 6 of 7/.test(note)));
assert.equal(input.coverage.x.status, 'complete');
assert.equal(input.coverage.affiliate.status, 'missing');
assert.equal(input.coverage.bing_ai.status, 'missing');
assert.ok(input.notes.some(note => /Manual supplement missing/.test(note)));

// Render: encrypted report lands in the ledger under a content-addressed name and decrypts to the shared template.
const rendered = renderWeeklyReport({ store, to: TO, key });
assert.equal(rendered.summary.label, '2026-W42');
assert.match(rendered.markdown, /# FeeEye 运营周报/);
assert.match(rendered.markdown, /2026-10-12 至 2026-10-18/);
const storedReport = readEncryptedJson(path.join(store, rendered.summary.encrypted_report), key);
assert.equal(storedReport, rendered.markdown);

// Manual supplement: strict schema, week binding, funnel metrics, optional Bing export.
const manual = {
  schema_version: 1,
  window: { from: FROM, to: TO },
  affiliate: { clicks: 12, registrations: 1, activations: 1, trade_volume_usdt: 400, commission_usdt: 0.4, coverage_note: 'KuCoin backend weekly aggregate' },
  bing_ai: { citations: 2, average_cited_pages: 1.5, coverage_note: 'manual export' },
  human_hours_total: 2.5,
  content: [{ id: 'safe-transfer-x-01', channel: 'x', human_hours: 0.5, effective_visits: 31 }],
  notes: []
};
stageManualSupplement(store, manual, key);
input = assembleWeeklyInput({ store, to: TO, key });
assert.equal(input.metrics.affiliate_clicks, 12);
assert.equal(input.metrics.commission_usdt, 0.4);
assert.equal(input.metrics.human_hours, 2.5);
assert.equal(input.metrics.bing_ai_citations, 2);
assert.equal(input.coverage.affiliate.status, 'complete');
assert.equal(input.coverage.bing_ai.status, 'complete');
assert.deepEqual(input.content, [{ id: 'safe-transfer-x-01', channel: 'x', human_hours: 0.5, effective_visits: 31 }]);
assert.throws(() => validateManualSupplement({ ...manual, window: { from: FROM, to: TO }, extra: 1 }, '2026-W42'), /Unexpected fields/);
assert.throws(() => validateManualSupplement({ ...manual, window: { from: '2026-10-11', to: TO } }, '2026-W42'), /seven full days/);
assert.throws(() => validateManualSupplement({ ...manual, window: { from: '2026-09-28', to: '2026-10-04' } }, '2026-W42'), /does not match/);
assert.throws(() => validateManualSupplement({ ...manual, human_hours_total: -1 }, null), /human hours/);

// Stale GSC receipt: metrics stay missing instead of reusing old data.
const staleStore = fs.mkdtempSync(path.join(os.tmpdir(), 'feeeye-weekly-stale-'));
writeEncryptedJson(path.join(staleStore, 'search/gsc/2026-09-01.json.enc'), { schema_version: 1, window: { from: '2026-08-04', to: '2026-09-01' }, coverage: { gsc: { status: 'complete', through: '2026-09-01', note_code: 'complete_aggregate_export' } }, pages: [{ url: 'https://feeeye.com/', clicks: 99, impressions: 999, average_position: 1.0 }] }, key);
const stale = assembleWeeklyInput({ store: staleStore, to: TO, key });
assert.equal(stale.coverage.gsc.status, 'missing');
assert.match(stale.coverage.gsc.note, /stale/);
assert.equal(stale.metrics.search_clicks, null);

// Freshness integration: degraded ledger warnings land in the report notes, not in coverage.
const freshnessFile = path.join(store, 'freshness.json');
fs.writeFileSync(freshnessFile, JSON.stringify({ schema_version: 1, generated_at: '2026-10-20T04:47:00.000Z', status: 'degraded', checks: [], warnings: ['复盘链路降级:search/gsc 最近提交已 12 天(上限 8 天)'] }));
const degraded = renderWeeklyReport({ store, to: TO, key, freshnessFile });
assert.equal(degraded.summary.ledger_status, 'degraded');
assert.ok(degraded.input.notes.some(note => note.startsWith('复盘链路降级:search/gsc')));
assert.match(degraded.markdown, /## 备注/);
assert.match(degraded.markdown, /- 复盘链路降级:search\/gsc 最近提交已 12 天/);
assert.throws(() => renderWeeklyReport({ store, to: TO, key, freshnessFile: path.join(store, 'missing-freshness.json') }), { code: 'ENOENT' });
fs.writeFileSync(path.join(store, 'bad-freshness.json'), JSON.stringify({ schema_version: 2, warnings: [] }));
assert.throws(() => renderWeeklyReport({ store, to: TO, key, freshnessFile: path.join(store, 'bad-freshness.json') }), /Invalid ledger freshness report/);

// CLI wiring: --render with the env key end-to-end on the seeded store. The manual supplement
// landed after the first render, so this pass produces a distinct content-addressed version
// instead of colliding with the immutable earlier file.
const cli = execFileSync(process.execPath, [path.join(root, 'build/ops/weekly_review.mjs'), '--render', '--store', store, '--to', TO, '--freshness-report', freshnessFile], { env: { ...process.env, FEEEYE_OPS_DATA_KEY: envKey } });
const summary = JSON.parse(cli.toString());
assert.equal(summary.label, '2026-W42');
assert.equal(summary.coverage.affiliate, 'complete');
assert.equal(summary.threshold_content_items, 1);
assert.match(summary.encrypted_report, /^reports\/weekly\/2026-W42__[a-f0-9]{16}\.md\.enc$/);
const versions = fs.readdirSync(path.join(store, 'reports/weekly')).filter(name => name.startsWith('2026-W42__'));
assert.equal(versions.length, 2);
const latest = readEncryptedJson(path.join(store, summary.encrypted_report), key);
assert.match(latest, /\| affiliate_clicks \| 12 \|/); // manual funnel numbers rendered into the re-run version

console.log('[OK] weekly review: ledger assembly, manual supplement gating, staleness downgrade, encrypted rendering, and CLI wiring.');
