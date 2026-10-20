#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEditorialSignals, buildAutonomousInput, buildWeeklyProposal, proposalMarkdown } from './weekly_proposal.mjs';
import { reviewContentLifecycle } from './content_lifecycle_review.mjs';
import { recordContentRegistration, loadContentRegistry } from './content_registry.mjs';
import { renderWeeklyReport } from './weekly_review.mjs';
import { writeEncryptedJson } from './private_data_crypto.mjs';
import { LEARNING_ARTICLES } from '../learning_content.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const key = crypto.randomBytes(32);
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'feeeye-proposal-'));
const write = (rel, body) => { const file = path.join(store, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); return file; };
const enc = (rel, value) => writeEncryptedJson(path.join(store, rel), value, key);
const TO = '2026-10-18';

// Ledger fixtures.
enc('search/gsc/2026-10-16.json.enc', {
  schema_version: 1, window: { from: '2026-09-19', to: '2026-10-16' },
  coverage: { gsc: { status: 'complete', through: '2026-10-16', note_code: 'complete_aggregate_export' } },
  pages: [
    { url: 'https://feeeye.com/learn/avoid-crypto-scams.html', clicks: 2, impressions: 95, average_position: 7.1 },
    { url: 'https://feeeye.com/zh/learn/avoid-crypto-scams.html', clicks: 3, impressions: 141, average_position: 5.2 },
    { url: 'https://feeeye.com/learn/safe-crypto-transfer.html', clicks: 35, impressions: 380, average_position: 6.0 },
    { url: 'https://feeeye.com/zh/', clicks: 0, impressions: 71, average_position: 4.2 }
  ]
});
recordContentRegistration(store, { schema_version: 1, content_id: 'site-learn-safe-crypto-transfer-en-2026-09-20', channel: 'site', landing_url: 'https://feeeye.com/learn/safe-crypto-transfer', published_at: '2026-09-20', checkpoints: ['7d', '28d'], source: 'postdeploy', registered_at: '2026-09-20T05:00:00.000Z', notes: [] });
enc('cross-channel/2026-10-17__2026-10-16__v2.json.enc', {
  schema_version: 2, generated_at: '2026-10-20T02:37:00.000Z', status: 'analyzed',
  source_windows: { cloudflare: { from: '2026-10-06', to: '2026-10-12' }, gsc: { from: '2026-09-19', to: '2026-10-16' } },
  metrics: { site_visits_7d: 100 }, page_opportunities: { candidate_count: 1, candidates: [{ rank: 1, canonical: 'https://feeeye.com/zh/', family: 'zh-home', clicks: 0, impressions: 71, ctr: 0, average_position: 4.2, observed_variants: ['https://feeeye.com/zh/'], actions: ['snippet_and_intent_review'] }] },
  attribution: { content_level: 'unavailable', reason: 'aggregate_sources_do_not_establish_content_attribution' }, decision: 'observe', reason: 'insufficient_samples', automatic_publication_allowed: false
});
enc('feedback/revision-plans/2026-10-16__aaaaaaaaaaaa__local.json.enc', {
  schema_version: 1, generated_at: '2026-10-16T23:59:59.000Z', source_window: { from: '2026-09-19', to: '2026-10-16' }, source_coverage: {}, source_build: { build_id: 'a'.repeat(64), source_revision: null },
  status: 'revision_evidence_plans_ready', decision: 'prepare_revision_evidence', plan_count: 1, blocked_plan_count: 0,
  plans: [{ article_id: 'avoid-crypto-scams', risk: 'high', locales_triggered: ['en'], priority: 'evidence_review', feedback: { responses: 12, negative_responses: 4, reasons: {} }, pages: {}, diagnostic_routes: ['official_fee_page_check'], required_evidence: [], active_experiment_conflict: false, status: 'evidence_required', next_stage: 'build_bilingual_revision_draft_after_evidence', content_patch_allowed: false, pull_request_allowed: false }],
  guardrails: { feedback_is_demand_evidence_not_fact: true }
});
enc('experiments/zh-home-snippet-2026-09-02__2026-10-16.json.enc', {
  schema_version: 1, experiment_id: 'zh-home-snippet-2026-09-02', observed_at: '2026-10-16T23:59:59.000Z', status: 'extend_observation', reason: 'minimum_impressions_not_met',
  source_window: { from: '2026-09-19', to: '2026-10-16', basis: 'final_28d_page_aggregate' }, deployment: { verified_at: '2026-09-02T10:00:00.000Z', review_not_before: '2026-09-30' },
  baseline: {}, observed: { clicks: 0, impressions: 71, ctr: 0, average_position: 4.2 }, minimum_impressions_before_review: 30, sample_gate_met: false, content_change_frozen: true
});

// Editorial signals derived from the GSC receipt: bilingual topic sums, null for unauthorized sources.
const lifecycle = reviewContentLifecycle({ store, key, to: TO });
const signals = buildEditorialSignals({ gsc: { window: { from: '2026-09-19', to: '2026-10-16' }, coverage: { gsc: { status: 'complete', note_code: 'complete_aggregate_export' } }, pages: [
  { url: 'https://feeeye.com/learn/avoid-crypto-scams.html', clicks: 2, impressions: 95, average_position: 7.1 },
  { url: 'https://feeeye.com/zh/learn/avoid-crypto-scams.html', clicks: 3, impressions: 141, average_position: 5.2 },
  { url: 'https://feeeye.com/learn/safe-crypto-transfer.html', clicks: 35, impressions: 380, average_position: 6.0 }
] }, registry: loadContentRegistry(store) });
assert.equal(signals.topics.length, LEARNING_ARTICLES.length);
const scams = signals.topics.find(topic => topic.id === 'avoid-crypto-scams');
assert.equal(scams.search_impressions, 236);
assert.equal(scams.search_clicks, 5);
assert.equal(scams.community_questions, null);
assert.equal(signals.topics.find(topic => topic.id === 'safe-crypto-transfer').materially_updated_at, '2026-09-20');

// Autonomous input: real ages from the registry, observed checkpoint values, zero history windows.
const autonomous = buildAutonomousInput({ lifecycle, manualContent: [{ id: 'site-learn-safe-crypto-transfer-en-2026-09-20', channel: 'site', human_hours: 1.5, effective_visits: 35 }], to: TO });
const siteItem = autonomous.items.find(item => item.id === 'site-learn-safe-crypto-transfer-en-2026-09-20');
assert.equal(siteItem.age_days, 28);
assert.equal(siteItem.effective_visits, 35);
assert.equal(siteItem.human_hours, 1.5);
assert.equal(siteItem.consecutive_qualified_windows, 0);

// Full proposal: every source wired, decisions from the vetted engines.
const weeklyInput = { content: [{ id: 'site-learn-safe-crypto-transfer-en-2026-09-20', channel: 'site', human_hours: 1.5, effective_visits: 35 }] };
const proposal = buildWeeklyProposal({ store, key, to: TO, weeklyInput, lifecycle });
assert.ok(proposal.topic_candidates.length >= 1);
assert.equal(proposal.topic_candidates[0].id, 'safe-crypto-transfer'); // highest impressions among topics with signal
assert.equal(proposal.page_improvements.length, 1);
assert.equal(proposal.page_improvements[0].canonical, 'https://feeeye.com/zh/');
assert.equal(proposal.feedback_revisions.plans[0].article_id, 'avoid-crypto-scams');
assert.equal(proposal.experiment.experiment_id, 'zh-home-snippet-2026-09-02');
assert.equal(proposal.experiment.sample_gate_met, false);
const siteDecision = proposal.autonomy.decisions.find(decision => decision.id === 'site-learn-safe-crypto-transfer-en-2026-09-20');
assert.equal(siteDecision.decision, 'maintain'); // age>=28, 35 visits, first qualified window
assert.equal(siteDecision.next_cadence_multiplier, 1);
assert.deepEqual(proposal.channel_efficiency, ['site-learn-safe-crypto-transfer-en-2026-09-20']);

// Markdown rendering: fixed structure, honest empty-state wording, no fabricated thresholds.
const markdown = proposalMarkdown(proposal);
assert.match(markdown, /## 下周提案/);
assert.match(markdown, /1\. safe-crypto-transfer\(380 曝光 \/ 35 点击/);
assert.match(markdown, /1\. https:\/\/feeeye\.com\/zh\/\(71 曝光 \/ 0 点击;snippet_and_intent_review\)/);
assert.match(markdown, /avoid-crypto-scams\[evidence_review\/evidence_required\]/);
assert.match(markdown, /zh-home-snippet-2026-09-02 → extend_observation/);
assert.match(markdown, /site-learn-safe-crypto-transfer-en-2026-09-20 → maintain\(first_qualified_window\)/);
assert.match(markdown, /单条 ≥30 有效访问且连续两个合格窗口/);

// Empty ledger: no fabricated candidates, calm fallback wording.
const emptyStore = fs.mkdtempSync(path.join(os.tmpdir(), 'feeeye-proposal-empty-'));
const emptyLifecycle = reviewContentLifecycle({ store: emptyStore, key, to: TO });
const emptyProposal = buildWeeklyProposal({ store: emptyStore, key, to: TO, weeklyInput: { content: [] }, lifecycle: emptyLifecycle });
assert.equal(emptyProposal.topic_candidates.length, 0);
assert.equal(emptyProposal.page_improvements.length, 0);
assert.equal(emptyProposal.feedback_revisions, null);
assert.equal(emptyProposal.experiment, null);
assert.match(proposalMarkdown(emptyProposal), /无候选——维持当前低频节奏/);

// Weekly report integration.
const rendered = renderWeeklyReport({ store, to: TO, key });
assert.match(rendered.markdown, /## 下周提案/);
assert.ok(rendered.summary.proposal_candidates >= 1);

console.log('[OK] weekly proposal: topic derivation, cross-channel and feedback receipts, experiment state, autonomous decisions, empty-ledger fallback, and weekly report integration.');
