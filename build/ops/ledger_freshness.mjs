#!/usr/bin/env node
// Phase 29 — 复盘链路自检:检查 automation-receipts 账本各目录的最近提交时间。
// 周采集目录(GSC/Cloudflare/跨渠道/实验/反馈)超过 8 天无提交 → degraded 告警;
// 低频目录(x、manual、reports/weekly)只报告年龄,不告警——没有帖子或没有人工
// 补充时这些目录本来就不该有新提交。fail-open:只告警,不重跑采集,不阻断周报。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DAY = 86_400_000;
export const WEEKLY_DIRS = ['search/gsc', 'analytics/cloudflare', 'cross-channel', 'experiments', 'feedback'];
export const INFORMATIONAL_DIRS = ['x', 'x-metrics', 'x-analysis', 'manual', 'reports/weekly'];
export const MAX_AGE_DAYS = 8;

const parseInstant = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;

// 纯逻辑:entries = [{dir, last_commit}]。周目录 missing/stale 都计入 degraded;低频目录仅记录。
export function evaluateFreshness(entries, nowIso) {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) throw new Error('Invalid freshness reference time');
  const seen = new Set();
  const checks = [], warnings = [];
  for (const entry of entries) {
    const dir = entry?.dir;
    if (!WEEKLY_DIRS.concat(INFORMATIONAL_DIRS).includes(dir) || seen.has(dir)) throw new Error(`Unexpected freshness entry: ${dir}`);
    seen.add(dir);
    const lastCommit = parseInstant(entry.last_commit);
    const ageDays = lastCommit === null ? null : Math.floor((now - Date.parse(lastCommit)) / DAY);
    const weekly = WEEKLY_DIRS.includes(dir);
    const status = lastCommit === null ? 'missing' : weekly && ageDays > MAX_AGE_DAYS ? 'stale' : 'ok';
    checks.push({ dir, last_commit: lastCommit, age_days: ageDays, expected_max_days: weekly ? MAX_AGE_DAYS : null, weekly, status });
    if (weekly && status !== 'ok') warnings.push(`复盘链路降级:${dir} ${lastCommit === null ? '账本中无提交记录' : `最近提交已 ${ageDays} 天(上限 ${MAX_AGE_DAYS} 天)`}`);
  }
  for (const dir of WEEKLY_DIRS.concat(INFORMATIONAL_DIRS)) if (!seen.has(dir)) throw new Error(`Missing freshness entry: ${dir}`);
  return { schema_version: 1, generated_at: nowIso, status: warnings.length ? 'degraded' : 'ok', checks, warnings };
}

// git 支撑:取账本仓库里某目录最后一次提交时间;无历史返回 null。
export function lastCommitFor(store, dir) {
  const cwd = path.resolve(store);
  if (!fs.existsSync(cwd) || !fs.existsSync(path.join(cwd, '.git'))) throw new Error('Ledger store must be a git checkout');
  const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', dir], { cwd, encoding: 'utf8' }).trim();
  return parseInstant(out) || null;
}

export function collectFreshness(store, nowIso = new Date().toISOString()) {
  return evaluateFreshness(WEEKLY_DIRS.concat(INFORMATIONAL_DIRS).map(dir => ({ dir, last_commit: lastCommitFor(store, dir) })), nowIso);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
  const store = value('--store'), now = value('--now') || new Date().toISOString();
  if (!store) throw new Error('Usage: --store LEDGER_CHECKOUT [--now ISO]');
  const report = collectFreshness(store, now);
  for (const warning of report.warnings) console.error(`::warning::${warning}`);
  console.log(JSON.stringify(report));
}
