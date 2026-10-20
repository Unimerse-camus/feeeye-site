#!/usr/bin/env node
// Phase 30 — 内容生命周期评审。
// 对登记表(content-registry)与 X 发布回执里的每条内容,在 7d/28d 检查点到期时
// 从既有回执取数:站内内容查 GSC 页面级信号(trailing 28 天口径,如实标注),
// X 帖查指标快照;YouTube/社区内容不自动抓取,标记 manual 由人工补充提供。
// 只读:不写账本、不改数据;未到期 → pending,到期无数据 → due_unreported,
// 均如实展示,不估算。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadContentRegistry, normalizeLandingUrl } from './content_registry.mjs';
import { latestDatedReceipt, loadXReceipts } from './ledger_reads.mjs';
import { loadMetricsSnapshots } from './x_metrics_analysis.mjs';

const DAY = 86_400_000;
const CHECKPOINT_DAYS = { '7d': 7, '28d': 28 };
const addDays = (day, n) => new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);

export function reviewContentLifecycle({ store, key, to }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Invalid lifecycle reference day');
  const registry = loadContentRegistry(store);
  const xItems = loadXReceipts(store).map(receipt => ({
    content_id: `x-${receipt.idempotency_key.slice(0, 12)}`,
    channel: 'x',
    landing_url: receipt.post_url,
    published_at: receipt.recorded_at.slice(0, 10),
    checkpoints: ['7d', '28d'],
    source: 'receipt',
    sourceKey: receipt.idempotency_key,
    notes: []
  }));
  const gsc = latestDatedReceipt(store, 'search/gsc', key);
  const snapshots = fs.existsSync(path.join(path.resolve(store), 'x-metrics')) ? loadMetricsSnapshots(store, key) : [];
  const items = [...registry, ...xItems].map(item => {
    const checkpoints = item.checkpoints.map(label => {
      const dueAt = addDays(item.published_at, CHECKPOINT_DAYS[label]);
      if (dueAt > to) return { label, status: 'pending', due_at: dueAt };
      if (item.channel === 'x') {
        const snapshot = snapshots.find(candidate => candidate.idempotency_key === item.sourceKey && candidate.checkpoint === label);
        if (!snapshot) return { label, status: 'due_unreported', due_at: dueAt };
        return { label, status: 'observed', due_at: dueAt, observed_at: snapshot.observed_at, metrics: { impressions: snapshot.metrics.impressions, url_clicks: snapshot.metrics.url_clicks } };
      }
      if (item.channel !== 'site') return { label, status: 'manual', due_at: dueAt };
      if (!gsc) return { label, status: 'due_unreported', due_at: dueAt, source_window: null };
      const page = gsc.pages.find(row => normalizeLandingUrl(row.url) === normalizeLandingUrl(item.landing_url));
      if (!page) return { label, status: 'observed', due_at: dueAt, source_window: gsc.window, metrics: { clicks: 0, impressions: 0, average_position: null }, note: 'absent from GSC page export = zero search impressions in window' };
      return { label, status: 'observed', due_at: dueAt, source_window: gsc.window, metrics: { clicks: page.clicks, impressions: page.impressions, average_position: page.average_position }, note: 'trailing 28-day final page aggregate' };
    });
    return { content_id: item.content_id, channel: item.channel, landing_url: item.landing_url, published_at: item.published_at, notes: item.notes, checkpoints };
  });
  return { schema_version: 1, reference_day: to, items };
}

export function lifecycleThreshold(item) {
  // 门槛对照:站点行用 GSC 点击,X 行用 url_clicks;manual/due_unreported 不可判定。
  const observed = item.checkpoints.filter(checkpoint => checkpoint.status === 'observed');
  const values = observed.map(checkpoint => (item.channel === 'x' ? checkpoint.metrics?.url_clicks ?? null : checkpoint.metrics?.clicks ?? null)).filter(value => value !== null);
  return values.length ? values.some(value => value >= 30) : null;
}

export function lifecycleMarkdown(report) {
  if (report.schema_version !== 1 || !Array.isArray(report.items)) throw new Error('Invalid lifecycle report');
  const shown = value => value === null || value === undefined ? '—' : String(value);
  const rows = report.items.flatMap(item => item.checkpoints.map(checkpoint => {
    const metrics = checkpoint.metrics || {};
    const search = item.channel === 'site' ? `${shown(metrics.clicks)} / ${shown(metrics.impressions)}` : '—';
    const social = item.channel === 'x' ? `${shown(metrics.impressions)} imp / ${shown(metrics.url_clicks)} clicks` : '—';
    const window = checkpoint.source_window ? `${checkpoint.source_window.from}..${checkpoint.source_window.to}` : checkpoint.observed_at ? checkpoint.observed_at.slice(0, 10) : '—';
    const threshold = lifecycleThreshold(item);
    return `| ${item.content_id} | ${item.channel} | ${item.published_at} | ${checkpoint.label} | ${checkpoint.status}${threshold === true ? ' ·达门槛' : ''} | ${search} | ${social} | ${window} |`;
  }));
  const body = rows.length ? rows.join('\n') : '| — | — | — | — | — | — | — | — |';
  return `## 内容生命周期\n\n参考日:${report.reference_day}。检查点未到期为 pending;到期无数据为 due_unreported,不估算。\n\n| 内容 | 渠道 | 发布 | 检查点 | 状态 | 搜索点击/曝光 | X 指标 | 数据窗口 |\n|---|---|---|---|---|---|---|---|\n${body}\n\n门槛对照:站点行以 GSC 点击、X 行以 url_clicks 对照「单条 ≥30 有效访问」门槛;搜索列为 trailing 28 天口径。YouTube/社区内容标记 manual,效果由人工补充提供,本表不自动抓取。\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
  const store = value('--store'), to = value('--to');
  if (!store || !to) throw new Error('Usage: --store LEDGER_DIR --to DATE (requires FEEEYE_OPS_DATA_KEY)');
  const { privateDataKey } = await import('./private_data_crypto.mjs');
  console.log(JSON.stringify(reviewContentLifecycle({ store, to, key: privateDataKey() })));
}
