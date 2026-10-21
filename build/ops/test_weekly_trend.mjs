#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWeeklyInputHistory, trendMarkdown, funnelMarkdown, consecutiveQualifiedWindows } from './weekly_trend.mjs';
import { buildAutonomousInput, buildWeeklyProposal, proposalMarkdown } from './weekly_proposal.mjs';
import { reviewContentLifecycle } from './content_lifecycle_review.mjs';
import { recordContentRegistration } from './content_registry.mjs';
import { renderWeeklyReport, stageManualSupplement } from './weekly_review.mjs';
import { analyzeAutonomousResults } from './autonomous_analysis.mjs';
import { writeEncryptedJson, readEncryptedJson } from './private_data_crypto.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const key = crypto.randomBytes(32);
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'feeeye-trend-'));
const enc = (rel, value) => writeEncryptedJson(path.join(store, rel), value, key);
const TO = '2026-10-18';
const metrics = overrides => ({ site_visits: null, search_clicks: null, search_impressions: null, ai_referral_visits: null, bing_ai_citations: null, bing_ai_average_cited_pages: null, x_posts_published: 0, x_link_clicks: null, affiliate_clicks: null, affiliate_registrations: null, commission_usdt: null, human_hours: null, ...overrides });
const weekInput = (from, to, content, metricOverrides = {}) => ({ schema_version: 1, window: { from, to }, coverage: {}, metrics: metrics(metricOverrides), content, notes: [] });

// History envelopes: two weeks qualified for one content id, an older unqualified week,
// and a duplicate version of W42 where the lexicographically larger digest must win.
const qualifiedId = 'site-learn-safe-crypto-transfer-en-2026-09-20';
enc('reports/weekly/2026-W40__aaaaaaaaaaaaaaa1.json.enc', { schema_version: 1, rendered_at: '2026-10-05T04:47:00Z', input: weekInput('2026-09-28', '2026-10-04', [{ id: qualifiedId, channel: 'site', human_hours: 1, effective_visits: 44 }], { site_visits: 50 }) });
enc('reports/weekly/2026-W41__aaaaaaaaaaaaaaa2.json.enc', { schema_version: 1, rendered_at: '2026-10-12T04:47:00Z', input: weekInput('2026-10-05', '2026-10-11', [{ id: qualifiedId, channel: 'site', human_hours: 1, effective_visits: 38 }], { site_visits: 61 }) });
enc('reports/weekly/2026-W39__aaaaaaaaaaaaaaa0.json.enc', { schema_version: 1, rendered_at: '2026-09-28T04:47:00Z', input: weekInput('2026-09-21', '2026-09-27', [{ id: qualifiedId, channel: 'site', human_hours: 1, effective_visits: 5 }], { site_visits: 40 }) });
enc('reports/weekly/2026-W41__aaaaaaaaaaaaaaa9.json.enc', { schema_version: 1, rendered_at: '2026-10-12T05:20:00Z', input: weekInput('2026-10-05', '2026-10-11', [{ id: qualifiedId, channel: 'site', human_hours: 1, effective_visits: 38 }, { id: 'late-manual-row', channel: 'x', human_hours: 0.5, effective_visits: null }], { site_visits: 61, x_posts_published: 1 }) });
const history = loadWeeklyInputHistory(store, key);
assert.deepEqual(history.map(input => input.window.to), ['2026-09-27', '2026-10-04', '2026-10-11']);
assert.equal(history.at(-1).content.length, 2); // duplicate W41 resolved to the larger digest

// Trend: 4 covered weeks (3 history + current), nulls shown as em dash, no fabrication.
const current = weekInput('2026-10-12', TO, [], { site_visits: 73, x_link_clicks: null });
const trend = trendMarkdown(history, current);
assert.match(trend, /## 近 4 周趋势\(仅展示\)/);
assert.match(trend, /覆盖 4 周/);
assert.match(trend, /\| 站点访问\(7d\) \| 40 \| 50 \| 61 \| 73 \|/);
assert.match(trend, /\| X 链接点击 \| — \| — \| — \| — \|/);
assert.equal(trendMarkdown([], current).match(/覆盖 1 周/).length, 1);

// Funnel: manual values with rates; missing layers stay em dash; no manual at all is explicit.
const manual = { affiliate: { clicks: 12, registrations: 1, activations: 1, trade_volume_usdt: 400, commission_usdt: 0.4, coverage_note: 'backend weekly' }, bing_ai: null, human_hours_total: 2, content: [], notes: [] };
const funnel = funnelMarkdown(manual);
assert.match(funnel, /## 返佣漏斗\(人工补充\)/);
assert.match(funnel, /\| 注册 \| 1 \| 8\.3% \|/);
assert.match(funnel, /\| 激活\(首笔交易\) \| 1 \| 100\.0% \|/);
assert.match(funnel, /不拼接、不构成用户级画像/);
const partial = funnelMarkdown({ ...manual, affiliate: { ...manual.affiliate, activations: null, commission_usdt: null } });
assert.match(partial, /\| 激活\(首笔交易\) \| — \| — \|/);
assert.match(funnelMarkdown(null), /本周无人工补充,漏斗不可用/);

// Consecutive qualified windows: two history weeks + current = 3; break = 0; unknown id = current only.
assert.equal(consecutiveQualifiedWindows(history, qualifiedId, true), 3);
assert.equal(consecutiveQualifiedWindows(history, qualifiedId, false), 0);
assert.equal(consecutiveQualifiedWindows(history, 'never-seen', true), 1);

// Autonomy with history: age>=28, 35 current visits, 2 consecutive prior windows → scale at the 1.25 cap.
recordContentRegistration(store, { schema_version: 1, content_id: qualifiedId, channel: 'site', landing_url: 'https://feeeye.com/learn/safe-crypto-transfer', published_at: '2026-09-20', checkpoints: ['7d', '28d'], source: 'postdeploy', registered_at: '2026-09-20T05:00:00.000Z', notes: [] });
enc('search/gsc/2026-10-16.json.enc', { schema_version: 1, window: { from: '2026-09-19', to: '2026-10-16' }, coverage: { gsc: { status: 'complete', through: '2026-10-16', note_code: 'complete_aggregate_export' } }, pages: [{ url: 'https://feeeye.com/learn/safe-crypto-transfer.html', clicks: 35, impressions: 380, average_position: 6.0 }] });
const lifecycle = reviewContentLifecycle({ store, key, to: TO });
const manualContent = [{ id: qualifiedId, channel: 'site', human_hours: 1.5, effective_visits: 35 }];
const autonomous = analyzeAutonomousResults(buildAutonomousInput({ lifecycle, manualContent, to: TO, history }));
const scaled = autonomous.decisions.find(decision => decision.id === qualifiedId);
assert.equal(scaled.decision, 'scale');
assert.equal(scaled.next_cadence_multiplier, 1.25);
assert.equal(scaled.reason, 'two_qualified_windows');

// Full render: manual staged first so the funnel and the qualified streak flow through.
stageManualSupplement(store, { schema_version: 1, window: { from: '2026-10-12', to: TO }, affiliate: manual.affiliate, bing_ai: null, human_hours_total: 2, content: manualContent, notes: [] }, key);
const rendered = renderWeeklyReport({ store, to: TO, key });
assert.match(rendered.markdown, /## 返佣漏斗\(人工补充\)/);
assert.match(rendered.markdown, /## 近 4 周趋势\(仅展示\)/);
assert.match(proposalMarkdown(rendered.proposal), /→ scale\(two_qualified_windows,×1\.25\)/);
assert.equal(rendered.summary.trend_weeks, 4);
assert.equal(rendered.summary.funnel, 'manual');
const historyFiles = fs.readdirSync(path.join(store, 'reports', 'weekly')).filter(name => name.endsWith('.json.enc'));
assert.equal(historyFiles.length, 5); // 4 seeded (W41 has two versions) + 1 new for the current week
const stored = readEncryptedJson(path.join(store, rendered.summary.encrypted_report.replace('.md.enc', '.json.enc')), key);
assert.equal(stored.input.window.to, TO);
const before = fs.statSync(path.join(store, rendered.summary.encrypted_report.replace('.md.enc', '.json.enc'))).mtimeMs;
renderWeeklyReport({ store, to: TO, key }); // idempotent re-render: existing history copy untouched
assert.equal(fs.statSync(path.join(store, rendered.summary.encrypted_report.replace('.md.enc', '.json.enc'))).mtimeMs, before);

console.log('[OK] weekly trend and funnel: history envelopes, dedup by digest, trend truncation, funnel rates, consecutive windows through the scale gate, and idempotent structured history.');
