#!/usr/bin/env node
// Phase 32 — 4 周趋势、affiliate 漏斗与连续合格窗口历史。
// 历史来源:周报渲染时同步落账本的「结构化输入副本」reports/weekly/<周>__<摘要>.json.enc
// (信封 {schema_version, rendered_at, input};同摘要已存在则跳过,不改写不可变账本)。
// 趋势仅展示不自动结论;漏斗只来自人工补充(affiliate 后台聚合),与站内匿名事件
// 不拼接( analytics-measurement-plan 红线);历史不足 4 周时截断,不补 0。
import fs from 'node:fs';
import path from 'node:path';
import { readEncryptedJson } from './private_data_crypto.mjs';

const METRIC_KEYS = ['site_visits', 'search_clicks', 'search_impressions', 'ai_referral_visits', 'bing_ai_citations', 'bing_ai_average_cited_pages', 'x_posts_published', 'x_link_clicks', 'affiliate_clicks', 'affiliate_registrations', 'commission_usdt', 'human_hours'];
const METRIC_LABELS = { site_visits: '站点访问(7d)', search_clicks: '搜索点击(28d)', search_impressions: '搜索曝光(28d)', ai_referral_visits: 'AI 来源访问(7d)', bing_ai_citations: 'Bing AI 引用', bing_ai_average_cited_pages: 'Bing 平均被引页', x_posts_published: 'X 发帖', x_link_clicks: 'X 链接点击', affiliate_clicks: '返佣点击', affiliate_registrations: '返佣注册', commission_usdt: '佣金(USDT)', human_hours: '人工小时' };

// 读取全部结构化周报输入,按周标签分组;同周多版本取文件名字典序最新(差异仅限
// 重复渲染,对趋势无实质影响),按窗口截止日升序返回。
export function loadWeeklyInputHistory(store, key) {
  const dir = path.join(path.resolve(store), 'reports', 'weekly');
  if (!fs.existsSync(dir)) return [];
  const byLabel = new Map();
  for (const name of fs.readdirSync(dir).filter(file => /^\d{4}-W\d{2}__[a-f0-9]{16}\.json\.enc$/.test(file)).sort()) {
    const label = name.slice(0, 8);
    byLabel.set(label, name);
  }
  return [...byLabel.values()].map(name => {
    const envelope = readEncryptedJson(path.join(dir, name), key);
    if (envelope?.schema_version !== 1 || !envelope.input || !envelope.input.window) throw new Error('Invalid weekly history envelope');
    return envelope.input;
  }).sort((a, b) => a.window.to.localeCompare(b.window.to));
}

const pct = value => value === null ? null : `${(value * 100).toFixed(1)}%`;
const shown = value => value === null || value === undefined ? '—' : String(value);

// 近 4 周滚动表:行=指标,列=周;仅展示,不自动结论。
export function trendMarkdown(history, currentInput) {
  const weeks = [...history.filter(input => input.window.to < currentInput.window.to), currentInput].slice(-4);
  const header = weeks.map(input => input.window.to).join(' | ');
  const rows = METRIC_KEYS.map(metric => `| ${METRIC_LABELS[metric]} | ${weeks.map(input => shown(input.metrics[metric])).join(' | ')} |`).join('\n');
  return `## 近 4 周趋势(仅展示)\n\n覆盖 ${weeks.length} 周(历史不足 4 周时如实截断,不补 0);口径见各指标括号注记。\n\n| 指标 | ${header} |\n|---|${weeks.map(() => '---:').join('|')}|\n${rows}\n`;
}

// affiliate 漏斗:点击 → 注册 → 激活 → 交易量 → 佣金;全部来自人工补充,缺失层显示 —。
export function funnelMarkdown(manual) {
  if (!manual) return `## 返佣漏斗(人工补充)\n\n本周无人工补充,漏斗不可用;不估算、不记 0。\n`;
  const a = manual.affiliate;
  const regRate = a.clicks > 0 && a.registrations !== null ? a.registrations / a.clicks : null;
  const actRate = a.registrations > 0 && a.activations !== null ? a.activations / a.registrations : null;
  return `## 返佣漏斗(人工补充)\n\n数据为 KuCoin affiliate 后台周聚合,归因窗口以后台口径为准;与站内匿名事件不拼接、不构成用户级画像。\n\n| 层 | 数值 | 转化率 |\n|---|---:|---:|\n| 点击 | ${shown(a.clicks)} | — |\n| 注册 | ${shown(a.registrations)} | ${shown(pct(regRate))} |\n| 激活(首笔交易) | ${shown(a.activations)} | ${shown(pct(actRate))} |\n| 交易量(USDT) | ${shown(a.trade_volume_usdt)} | — |\n| 佣金(USDT) | ${shown(a.commission_usdt)} | — |\n`;
}

// 连续合格窗口:从最近一个历史周向前数,连续 effective_visits ≥ 30 的周数;
// 锚定本周——本周不合格则连胜归 0(连续语义)。只认人工补充行(人背书的有效访问)。
export function consecutiveQualifiedWindows(history, contentId, currentQualified) {
  if (!currentQualified) return 0;
  let count = 1;
  const weeks = [...history].sort((a, b) => b.window.to.localeCompare(a.window.to));
  for (const input of weeks) {
    const row = (input.content || []).find(item => item.id === contentId);
    const qualified = row && row.effective_visits !== null && row.effective_visits >= 30;
    if (!qualified) break;
    count += 1;
  }
  return count;
}
