#!/usr/bin/env node
// Phase 28 — 自动化周报复盘装配器。
// 从 automation-receipts 账本读取既有加密回执(GSC / Cloudflare / X 指标分析)+ 人工补充
// (affiliate 后台聚合、人工小时、内容效率行),装配 weekly_report.mjs 的输入 schema,
// 渲染周报并加密写回账本 reports/weekly/。缺失来源保持 null,不补 0,不阻断生成。
// 治理边界:复盘只读;不发布、不选题、不修改线上内容;私有数据只落加密账本。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, sha256, validDay } from './ops_util.mjs';
import { privateDataKey, readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';
import { buildWeeklyReport, validateWeeklyInput } from './weekly_report.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const DAY = 86_400_000;
const exact = (value, keys, label) => { if (!value || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys.slice().sort())) throw new Error(`Unexpected fields: ${label}`); };
const nullableNumber = value => value === null || (Number.isFinite(value) && value >= 0);

export function weekWindow(to) {
  if (!validDay(to)) throw new Error('Invalid weekly window end');
  return { from: new Date(Date.parse(to) - 6 * DAY).toISOString().slice(0, 10), to };
}

// ISO-8601 周标签(以周四所在周为准),例如 2026-W43。
export function weekLabel(to) {
  if (!validDay(to)) throw new Error('Invalid weekly window end');
  const date = new Date(`${to}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date - yearStart) / DAY + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const AFFILIATE_FIELDS = ['activations', 'clicks', 'commission_usdt', 'coverage_note', 'registrations', 'trade_volume_usdt'];
const BING_FIELDS = ['average_cited_pages', 'citations', 'coverage_note'];
const noteText = value => typeof value === 'string' && value.length <= 240;

// 人工补充 schema:affiliate 后台聚合(归因口径以后台为准,不与站内事件拼接)、
// 总人工小时、内容效率行;可选 Bing AI 导出。数字缺失一律 null,不编造。
export function validateManualSupplement(data, expectedLabel) {
  exact(data, ['affiliate', 'bing_ai', 'content', 'human_hours_total', 'notes', 'schema_version', 'window'], 'manual supplement');
  if (data.schema_version !== 1 || !validDay(data.window?.from) || !validDay(data.window?.to)) throw new Error('Invalid manual window');
  const expected = weekWindow(data.window.to);
  if (data.window.from !== expected.from) throw new Error('Manual window must be seven full days');
  if (expectedLabel && weekLabel(data.window.to) !== expectedLabel) throw new Error('Manual supplement does not match the requested week');
  exact(data.affiliate, AFFILIATE_FIELDS, 'manual affiliate');
  for (const field of AFFILIATE_FIELDS) if (field === 'coverage_note' ? !noteText(data.affiliate[field]) : !nullableNumber(data.affiliate[field])) throw new Error(`Invalid manual affiliate metric: ${field}`);
  if (data.bing_ai !== null) {
    exact(data.bing_ai, BING_FIELDS, 'manual bing_ai');
    for (const field of BING_FIELDS) if (field === 'coverage_note' ? !noteText(data.bing_ai[field]) : !nullableNumber(data.bing_ai[field])) throw new Error(`Invalid manual bing_ai metric: ${field}`);
  }
  if (!Number.isFinite(data.human_hours_total) || data.human_hours_total < 0) throw new Error('Invalid manual human hours');
  if (!Array.isArray(data.content) || !Array.isArray(data.notes)) throw new Error('Incomplete manual supplement');
  for (const row of data.content) {
    exact(row, ['channel', 'effective_visits', 'human_hours', 'id'], 'manual content row');
    if (!/^[a-z0-9-]+$/.test(row.id || '') || !['site', 'x', 'youtube', 'community'].includes(row.channel) || !Number.isFinite(row.human_hours) || row.human_hours < 0 || !nullableNumber(row.effective_visits)) throw new Error('Invalid manual content row');
  }
  for (const note of data.notes) if (typeof note !== 'string' || note.length > 240) throw new Error('Invalid manual note');
  return data;
}

function latestDatedReceipt(store, folder, key) {
  const dir = path.join(path.resolve(store), ...folder.split('/'));
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(name => /^\d{4}-\d{2}-\d{2}\.json\.enc$/.test(name)).sort();
  return files.length ? readEncryptedJson(path.join(dir, files.at(-1)), key) : null;
}

function loadLatestXAnalysis(store, key) {
  const dir = path.join(path.resolve(store), 'x-analysis');
  if (!fs.existsSync(dir)) return null;
  let best = null, bestObserved = '';
  for (const file of fs.readdirSync(dir).filter(name => /^[a-f0-9]{64}\.json\.enc$/.test(name)).sort()) {
    const report = readEncryptedJson(path.join(dir, file), key);
    if (report?.schema_version !== 1 || !Array.isArray(report.facts)) throw new Error('Invalid X analysis receipt');
    const observed = report.facts.reduce((max, fact) => String(fact.observed_at || '') > max ? String(fact.observed_at) : max, '');
    if (observed >= bestObserved) { bestObserved = observed; best = report; }
  }
  return best ? { report: best, observedThrough: bestObserved || null } : null;
}

function loadXReceipts(store) {
  const dir = path.join(path.resolve(store), 'x');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => {
    const receipt = readJson(path.join(dir, name));
    if (receipt?.schema_version !== 1 || typeof receipt.recorded_at !== 'string' || typeof receipt.post_created !== 'boolean') throw new Error('Invalid X publish receipt');
    return receipt;
  });
}

function manualReceiptPath(store, label) { return path.join(path.resolve(store), 'manual', `weekly-${label}.json.enc`); }

// 阶段 29:读入账本新鲜度报告,把降级告警写进周报 notes(fail-open,文件缺失时跳过)。
function loadFreshnessWarnings(file) {
  if (!file) return [];
  const report = readJson(file);
  if (report?.schema_version !== 1 || !Array.isArray(report.warnings) || report.warnings.some(warning => typeof warning !== 'string' || warning.length > 240)) throw new Error('Invalid ledger freshness report');
  return report.warnings.slice();
}

export function stageManualSupplement(store, data, key) {
  const label = weekLabel(data.window.to);
  validateManualSupplement(data, label);
  return writeEncryptedJson(manualReceiptPath(store, label), data, key);
}

const coverage = (status, through, note) => ({ status, through, note });

export function assembleWeeklyInput({ store, to, key, freshnessFile = null }) {
  const window = weekWindow(to);
  const metrics = { site_visits: null, search_clicks: null, search_impressions: null, ai_referral_visits: null, bing_ai_citations: null, bing_ai_average_cited_pages: null, x_posts_published: 0, x_link_clicks: null, affiliate_clicks: null, affiliate_registrations: null, commission_usdt: null, human_hours: null };
  // 不放实时时间戳:时间由账本提交与内容寻址文件名承载,保证同输入重跑幂等。
  const notes = ['Assembled from encrypted ledger receipts by build/ops/weekly_review.mjs.'];
  notes.push(...loadFreshnessWarnings(freshnessFile));

  // GSC:回执是 trailing 28 天、终值口径的页面聚合,与周窗口不同宽——只作趋势可比使用,coverage 标 partial。
  const gsc = latestDatedReceipt(store, 'search/gsc', key);
  let gscCoverage = coverage('missing', null, 'No GSC page-signal receipt in the ledger');
  if (gsc) {
    if (Date.parse(window.to) - Date.parse(gsc.window.to) > 10 * DAY) {
      gscCoverage = coverage('missing', null, `GSC receipt stale (window ends ${gsc.window.to})`);
      notes.push('GSC receipt older than 10 days; search metrics left missing instead of reused.');
    } else {
      metrics.search_clicks = gsc.pages.reduce((n, page) => n + page.clicks, 0);
      metrics.search_impressions = gsc.pages.reduce((n, page) => n + page.impressions, 0);
      gscCoverage = coverage('partial', gsc.window.to, `Trailing 28-day final page aggregate ${gsc.window.from}..${gsc.window.to}; trend-comparable, not a 7-day sum`);
    }
  }

  // Cloudflare:回执含逐日序列,按周窗口切片后可求真实 7 天和;EU 访客被排除,coverage 保持 partial。
  const cf = latestDatedReceipt(store, 'analytics/cloudflare', key);
  let cfCoverage = coverage('missing', null, 'No Cloudflare analytics receipt in the ledger');
  if (cf) {
    const days = (cf.daily || []).filter(day => day.date >= window.from && day.date <= window.to);
    if (days.length) {
      metrics.site_visits = days.reduce((n, day) => n + day.visits, 0);
      metrics.ai_referral_visits = days.reduce((n, day) => n + (day.sources?.ai || 0), 0);
      cfCoverage = coverage('partial', days.at(-1).date, `EU visitors excluded (Web Analytics); ${days.length}/7 report days covered by receipt window`);
      if (days.length < 7) notes.push(`Cloudflare receipt overlaps only ${days.length} of 7 report days.`);
    } else {
      cfCoverage = coverage('missing', null, `Cloudflare receipt window ${cf.window?.from}..${cf.window?.to} does not overlap the report week`);
    }
  }

  // X:窗口内真实发布的帖子数(明文幂等回执)+ 最新指标分析里各帖最新检查点的 url_clicks 累计。
  metrics.x_posts_published = loadXReceipts(store).filter(receipt => receipt.post_created && receipt.recorded_at.slice(0, 10) >= window.from && receipt.recorded_at.slice(0, 10) <= window.to).length;
  const analysis = loadLatestXAnalysis(store, key);
  let xCoverage = coverage('partial', null, 'Public publish receipts only; no metrics analysis receipt');
  if (analysis?.report?.status === 'analyzed') {
    const clicks = analysis.report.facts.map(fact => fact.metrics?.url_clicks ?? null);
    if (clicks.length) {
      if (clicks.every(value => value === null)) metrics.x_link_clicks = null;
      else metrics.x_link_clicks = clicks.reduce((n, value) => n + (value || 0), 0);
      xCoverage = coverage('complete', analysis.observedThrough?.slice(0, 10) ?? null, `Link clicks are cumulative per post at its latest checkpoint (${analysis.report.facts.length} tracked posts)`);
    }
  }

  // 人工补充:affiliate 后台聚合 + 人工小时 + 内容效率行(+ 可选 Bing AI 导出)。
  const manualPath = manualReceiptPath(store, weekLabel(to));
  const manual = fs.existsSync(manualPath) ? readEncryptedJson(manualPath, key) : null;
  let affiliateCoverage = coverage('missing', null, 'No manual supplement staged for this week');
  let bingCoverage = coverage('missing', null, 'No authorized Bing AI Performance export supplied');
  let content = [];
  if (manual) {
    validateManualSupplement(manual, weekLabel(to));
    metrics.affiliate_clicks = manual.affiliate.clicks;
    metrics.affiliate_registrations = manual.affiliate.registrations;
    metrics.commission_usdt = manual.affiliate.commission_usdt;
    metrics.human_hours = manual.human_hours_total;
    affiliateCoverage = coverage(manual.affiliate.commission_usdt === null ? 'partial' : 'complete', window.to, 'KuCoin affiliate backend weekly aggregate; attribution window per backend');
    if (manual.bing_ai) {
      metrics.bing_ai_citations = manual.bing_ai.citations;
      metrics.bing_ai_average_cited_pages = manual.bing_ai.average_cited_pages;
      bingCoverage = coverage('complete', window.to, 'Bing Webmaster AI Performance manual export');
    }
    content = manual.content.map(({ id, channel, human_hours, effective_visits }) => ({ id, channel, human_hours, effective_visits }));
  } else {
    notes.push('Manual supplement missing: affiliate funnel and human-effort metrics stay null; do not treat as zero.');
  }

  const input = {
    schema_version: 1,
    window,
    coverage: { cloudflare: cfCoverage, gsc: gscCoverage, bing_ai: bingCoverage, x: xCoverage, affiliate: affiliateCoverage },
    metrics, content, notes
  };
  return validateWeeklyInput(input);
}

export function renderWeeklyReport({ store, to, key, freshnessFile = null }) {
  const input = assembleWeeklyInput({ store, to, key, freshnessFile });
  const markdown = buildWeeklyReport(input);
  const label = weekLabel(to);
  // 内容寻址文件名:同内容重跑幂等;manual 补充晚到后的重跑生成新版本,旧版本保留供审计。
  const digest = sha256(markdown).slice(0, 16);
  const relative = path.join('reports', 'weekly', `${label}__${digest}.md.enc`);
  writeEncryptedJson(path.join(path.resolve(store), relative), markdown, key);
  const summary = {
    label, window: input.window,
    coverage: Object.fromEntries(Object.entries(input.coverage).map(([source, value]) => [source, value.status])),
    ledger_status: input.notes.some(note => note.startsWith('复盘链路降级')) ? 'degraded' : 'ok',
    x_posts_published: input.metrics.x_posts_published,
    threshold_content_items: input.content.filter(row => row.effective_visits !== null && row.effective_visits >= 30).length,
    encrypted_report: relative
  };
  return { input, markdown, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
  const store = value('--store');
  if (!store) throw new Error('Usage: --store LEDGER_DIR (--stage-manual --input FILE | --assemble [--to DATE] | --render [--to DATE])');
  const key = privateDataKey();
  if (args.includes('--stage-manual')) {
    const input = value('--input');
    if (!input) throw new Error('--stage-manual requires --input FILE');
    const result = stageManualSupplement(store, readJson(input), key);
    console.log(JSON.stringify({ staged: true, created: result.created, file: path.relative(path.resolve(store), result.file) }));
  } else if (args.includes('--render')) {
    const to = value('--to') || new Date(Date.now() - DAY).toISOString().slice(0, 10);
    const { summary } = renderWeeklyReport({ store, to, key, freshnessFile: value('--freshness-report') });
    console.log(JSON.stringify(summary));
  } else if (args.includes('--assemble')) {
    const to = value('--to') || new Date(Date.now() - DAY).toISOString().slice(0, 10);
    console.log(JSON.stringify(assembleWeeklyInput({ store, to, key, freshnessFile: value('--freshness-report') })));
  } else {
    throw new Error('Provide --stage-manual, --assemble, or --render');
  }
}
