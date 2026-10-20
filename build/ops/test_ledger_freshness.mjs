#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateFreshness, collectFreshness, lastCommitFor, WEEKLY_DIRS, INFORMATIONAL_DIRS } from './ledger_freshness.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const NOW = '2026-10-20T08:00:00.000Z';
const DAY = 86_400_000;

// Workflow contracts: both daily health and weekly review inspect the ledger,
// and neither shallow-clones it (freshness needs per-directory history).
const healthWorkflow = fs.readFileSync(path.join(root, '.github/workflows/ops-health.yml'), 'utf8');
assert.match(healthWorkflow, /ref: automation-receipts/);
assert.ok(!/path: receipt-ledger\n\s+fetch-depth/.test(healthWorkflow));
assert.match(healthWorkflow, /ledger_freshness\.mjs --store receipt-ledger/);
const reviewWorkflow = fs.readFileSync(path.join(root, '.github/workflows/weekly-review.yml'), 'utf8');
assert.ok(!/path: receipt-ledger\n\s+fetch-depth/.test(reviewWorkflow));
assert.match(reviewWorkflow, /ledger_freshness\.mjs --store \.\.\/receipt-ledger/);
assert.match(reviewWorkflow, /--freshness-report ops\/automation\/working\/ledger-freshness\.json/);

// Pure evaluation: all entries fresh and present → ok.
const freshEntries = WEEKLY_DIRS.concat(INFORMATIONAL_DIRS).map(dir => ({ dir, last_commit: NOW }));
assert.equal(evaluateFreshness(freshEntries, NOW).status, 'ok');

// Weekly directory stale beyond the 8-day cap → degraded with a Chinese warning line.
const stale = freshEntries.map(entry => entry.dir === 'search/gsc' ? { ...entry, last_commit: new Date(Date.parse(NOW) - 10 * DAY).toISOString() } : entry);
const staleReport = evaluateFreshness(stale, NOW);
assert.equal(staleReport.status, 'degraded');
assert.equal(staleReport.checks.find(check => check.dir === 'search/gsc').status, 'stale');
assert.match(staleReport.warnings[0], /复盘链路降级:search\/gsc 最近提交已 10 天/);

// Boundary: exactly 8 days is still ok; missing weekly directory degrades; informational gaps never do.
const boundary = freshEntries.map(entry => entry.dir === 'feedback' ? { ...entry, last_commit: new Date(Date.parse(NOW) - 8 * DAY).toISOString() } : entry);
assert.equal(evaluateFreshness(boundary, NOW).status, 'ok');
const missingWeekly = freshEntries.map(entry => entry.dir === 'cross-channel' ? { dir: 'cross-channel', last_commit: null } : entry);
const missingReport = evaluateFreshness(missingWeekly, NOW);
assert.equal(missingReport.status, 'degraded');
assert.match(missingReport.warnings[0], /无提交记录/);
const missingInformational = freshEntries.map(entry => entry.dir === 'manual' ? { dir: 'manual', last_commit: null } : entry);
assert.equal(evaluateFreshness(missingInformational, NOW).status, 'ok');
assert.throws(() => evaluateFreshness([{ dir: 'unexpected', last_commit: NOW }], NOW), /Unexpected freshness entry/);
assert.throws(() => evaluateFreshness(freshEntries.slice(0, -1), NOW), /Missing freshness entry/);
assert.throws(() => evaluateFreshness(freshEntries, 'not-a-time'), /Invalid freshness reference/);

// Git collection: build a temp ledger with controlled commit dates per directory.
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'feeeye-freshness-'));
const git = (args, env = {}) => execFileSync('git', args, { cwd: store, encoding: 'utf8', env: { ...process.env, ...env } });
git(['init', '-q']);
git(['config', 'user.name', 'test']);
git(['config', 'user.email', 'test@example.invalid']);
const commitAt = (dir, daysAgo) => {
  fs.mkdirSync(path.join(store, dir), { recursive: true });
  fs.writeFileSync(path.join(store, dir, 'receipt.json.enc'), String(daysAgo));
  const when = new Date(Date.parse(NOW) - daysAgo * DAY).toISOString();
  git(['add', dir], { GIT_COMMITTER_DATE: when, GIT_AUTHOR_DATE: when });
  git(['commit', '-q', '-m', `commit ${dir} ${daysAgo}d`], { GIT_COMMITTER_DATE: when, GIT_AUTHOR_DATE: when });
};
commitAt('search/gsc', 1);
commitAt('analytics/cloudflare', 1);
commitAt('cross-channel', 1);
commitAt('experiments', 12); // stale weekly directory
commitAt('feedback', 1);
commitAt('x', 5);
assert.equal(Date.parse(lastCommitFor(store, 'search/gsc')), Date.parse(NOW) - 1 * DAY);
assert.equal(lastCommitFor(store, 'manual'), null);
const collected = collectFreshness(store, NOW);
assert.equal(collected.status, 'degraded');
assert.equal(collected.checks.find(check => check.dir === 'experiments').status, 'stale');
assert.ok(collected.warnings.some(warning => warning.includes('experiments')));
assert.throws(() => lastCommitFor('/tmp/definitely-not-a-repo', 'search/gsc'), /git checkout/);

console.log('[OK] ledger freshness: weekly vs informational thresholds, boundary age, missing and unexpected entries, git history collection, and workflow wiring.');
