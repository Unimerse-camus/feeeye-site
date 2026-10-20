#!/usr/bin/env node
// Phase 31 — 下周提案(决策闭环出口)。
// 把散在各账本目录里的复盘产物汇成一个周报尾部的「下周提案」区块:
// 主选题候选(topic_queue 逻辑 + 从 GSC 回执派生的 28 天信号)、页面改进候选
// (cross-channel 报告)、反馈修订项(feedback/revision-plans)、实验状态
// (experiments)、自主引擎建议(autonomous_analysis 首次接入调度,仅建议)。
// 治理:提案只是提案——选题、放大、发布永远人拍板;放大只引用「单条 ≥30
// 有效访问 + 连续两个合格窗口」既有规则;无候选时输出"维持低频节奏",不编造。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEARNING_ARTICLES } from '../learning_content.mjs';
import { buildTopicQueue } from './topic_queue.mjs';
import { analyzeAutonomousResults } from './autonomous_analysis.mjs';
import { latestDatedReceipt } from './ledger_reads.mjs';
import { loadContentRegistry, normalizeLandingUrl } from './content_registry.mjs';
import { readEncryptedJson } from './private_data_crypto.mjs';

const DAY = 86_400_000;

function latestEncryptedFile(store, folder, key, pattern) {
  const dir = path.join(path.resolve(store), ...folder.split('/'));
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(name => pattern.test(name)).sort();
  return files.length ? readEncryptedJson(path.join(dir, files.at(-1)), key) : null;
}

// cross-channel:文件名 <cf.to>__<gsc.to>__v2.json.enc,按名取最新。
function latestCrossChannel(store, key) { return latestEncryptedFile(store, 'cross-channel', key, /^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}__v2\.json\.enc$/); }
// 反馈修订计划:<to>__<build12>__<rev>.json.enc,日期前缀可直接按名取最新。
function latestRevisionPlans(store, key) { return latestEncryptedFile(store, 'feedback/revision-plans', key, /\.json\.enc$/); }
// 实验观察:<experiment_id>__<to>.json.enc,先按窗口截止日取最新,再按名稳定排序。
function latestExperiment(store, key) {
  const dir = path.join(path.resolve(store), 'experiments');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(name => /^(?<id>[a-z0-9-]+)__(?<to>\d{4}-\d{2}-\d{2})\.json\.enc$/.test(name));
  if (!files.length) return null;
  const best = files.map(name => ({ name, to: name.match(/__(\d{4}-\d{2}-\d{2})\.json\.enc$/)[1] })).sort((a, b) => a.to.localeCompare(b.to) || a.name.localeCompare(b.name)).at(-1);
  return readEncryptedJson(path.join(dir, best.name), key);
}

// 从 GSC 回执 + 内容登记表派生 topic_queue 的 28 天编辑信号。
// community_questions / ai_citations 无授权来源,保持 null;evidence_status
// 自动评估不了新鲜度,固定 current(由人工周会复核),materially_updated_at
// 取该主题页最近一次实质变更登记日。
export function buildEditorialSignals({ gsc, registry }) {
  const topics = LEARNING_ARTICLES.map(article => {
    const landing = [`https://feeeye.com/learn/${article.slug}`, `https://feeeye.com/zh/learn/${article.slug}`].map(normalizeLandingUrl);
    const pages = gsc.pages.filter(row => landing.includes(normalizeLandingUrl(row.url)));
    const updated = registry.filter(entry => entry.channel === 'site' && landing.includes(normalizeLandingUrl(entry.landing_url))).map(entry => entry.published_at).sort().at(-1) ?? null;
    return {
      id: article.slug,
      evidence_status: 'current',
      search_impressions: pages.reduce((n, page) => n + page.impressions, 0),
      search_clicks: pages.reduce((n, page) => n + page.clicks, 0),
      ai_citations: null,
      community_questions: null,
      materially_updated_at: updated
    };
  });
  return {
    schema_version: 1,
    window: gsc.window,
    coverage: {
      gsc: { status: gsc.coverage.gsc.status, through: gsc.window.to, note_code: gsc.coverage.gsc.note_code },
      bing_ai: { status: 'missing', through: null, note_code: 'no_authorized_export' },
      community: { status: 'missing', through: null, note_code: 'no_authorized_export' }
    },
    topics
  };
}

// 自主引擎输入:从生命周期条目构造(发布年龄真实、效果取检查点观察值),
// 治理旗标为自动填入(无违规/发布错误记录;站内双语由 postdeploy 全量校验背书),
// consecutive_qualified_windows 固定 0(历史合格窗口统计属阶段 5)。
export function buildAutonomousInput({ lifecycle, manualContent, to }) {
  const from = new Date(Date.parse(to) - 27 * DAY).toISOString().slice(0, 10);
  const hours = Object.fromEntries((manualContent || []).map(row => [row.id, row.human_hours]));
  const items = lifecycle.items.map(item => {
    const ageDays = Math.max(0, Math.min(365, Math.round((Date.parse(to) - Date.parse(item.published_at)) / DAY)));
    const observed = item.checkpoints.filter(checkpoint => checkpoint.status === 'observed');
    const effectiveVisits = item.channel === 'x'
      ? observed.map(checkpoint => checkpoint.metrics?.url_clicks).filter(value => value !== null && value !== undefined)
      : item.channel === 'site' ? observed.map(checkpoint => checkpoint.metrics?.clicks).filter(value => value !== null && value !== undefined) : [];
    return {
      id: item.content_id, channel: item.channel, age_days: ageDays,
      effective_visits: effectiveVisits.length ? Math.max(...effectiveVisits) : null,
      human_hours: hours[item.content_id] ?? 0,
      rule_violations: 0, publish_errors: 0, source_current: true, bilingual_verified: true,
      consecutive_qualified_windows: 0
    };
  });
  return { schema_version: 1, window: { from, to }, items };
}

export function buildWeeklyProposal({ store, key, to, weeklyInput, lifecycle }) {
  const registry = loadContentRegistry(store);
  const gsc = latestDatedReceipt(store, 'search/gsc', key);
  const topicQueue = gsc ? buildTopicQueue(buildEditorialSignals({ gsc, registry })) : null;
  const cross = latestCrossChannel(store, key);
  const revisions = latestRevisionPlans(store, key);
  const experiment = latestExperiment(store, key);
  const autonomy = analyzeAutonomousResults(buildAutonomousInput({ lifecycle, manualContent: weeklyInput.content, to }));
  return {
    schema_version: 1,
    reference_day: to,
    topic_candidates: topicQueue ? topicQueue.candidates : [],
    topic_note: gsc ? '信号派生自 GSC 28 天页面聚合;community_questions 与 ai_citations 无授权来源保持缺失,evidence_status 自动固定 current,需人工复核。' : 'GSC 回执缺失,无选题候选。',
    page_improvements: cross?.page_opportunities?.candidates ?? [],
    feedback_revisions: revisions ? { status: revisions.status, decision: revisions.decision, plan_count: revisions.plan_count, plans: (revisions.plans || []).map(plan => ({ article_id: plan.article_id, priority: plan.priority, status: plan.status, locales: plan.locales_triggered })) } : null,
    experiment: experiment ? { experiment_id: experiment.experiment_id, status: experiment.status, reason: experiment.reason, sample_gate_met: experiment.sample_gate_met, review_not_before: experiment.deployment?.review_not_before ?? null } : null,
    autonomy: { decisions: autonomy.decisions, max_scale_multiplier: autonomy.max_scale_multiplier, flag_note: 'source_current/bilingual_verified 为自动填入旗标(无违规记录;站内双语经 postdeploy 全量校验);consecutive_qualified_windows 暂为 0,连续窗口历史属阶段 5。' },
    channel_efficiency: weeklyInput.content.filter(row => row.effective_visits !== null && row.effective_visits >= 30).map(row => row.id),
    guardrails: { selection_required: true, scale_rule: '单条 ≥30 有效访问且连续两个合格窗口,放大上限 1.25', automatic_publication: false }
  };
}

export function proposalMarkdown(proposal) {
  if (proposal.schema_version !== 1) throw new Error('Invalid weekly proposal');
  const topics = proposal.topic_candidates.length
    ? proposal.topic_candidates.map(candidate => `${candidate.rank}. ${candidate.id}(${candidate.signals.search_impressions ?? '—'} 曝光 / ${candidate.signals.search_clicks ?? '—'} 点击;${candidate.reasons.join('、') || '仅排序信号'})`).join(';')
    : '无候选——维持当前低频节奏,不自动增加发帖量。';
  const pages = proposal.page_improvements.length
    ? proposal.page_improvements.map(candidate => `${candidate.rank}. ${candidate.canonical}(${candidate.impressions} 曝光 / ${candidate.clicks} 点击;${candidate.actions.join('、')})`).join(';')
    : '本周无达证据门槛的页面改进候选。';
  const revisions = proposal.feedback_revisions
    ? (proposal.feedback_revisions.plans.length
        ? proposal.feedback_revisions.plans.map(plan => `${plan.article_id}[${plan.priority}/${plan.status}]`).join(';')
        : '无修订候选。') + `(${proposal.feedback_revisions.status})`
    : '无反馈修订回执。';
  const experiment = proposal.experiment
    ? `${proposal.experiment.experiment_id} → ${proposal.experiment.status}(${proposal.experiment.reason});样本门:${proposal.experiment.sample_gate_met ? '已达标' : '未达标'};复盘不早于 ${proposal.experiment.review_not_before ?? '—'}`
    : '无进行中实验回执。';
  const efficiency = proposal.channel_efficiency.length ? proposal.channel_efficiency.join('、') : '暂无达 30 访问门槛的内容。';
  const autonomy = proposal.autonomy.decisions.length
    ? proposal.autonomy.decisions.map(decision => `${decision.id} → ${decision.decision}(${decision.reason}${decision.next_cadence_multiplier !== 1 ? `,×${decision.next_cadence_multiplier}` : ''})`).join(';')
    : '无生命周期内容可评估。';
  return `## 下周提案(自动生成,仅建议;选题与放大由人工确认)

- 主选题候选(≤5,人只选 1):${topics}
  ${proposal.topic_note}
- 页面改进候选(仅审查已有页,不自动新建):${pages}
- 反馈修订项:${revisions}
- 实验状态:${experiment}
- 渠道效率(仅列达门槛项):${efficiency}
- 自主引擎建议(放大上限 ×${proposal.autonomy.max_scale_multiplier}):${autonomy}
  ${proposal.autonomy.flag_note}

放大判定只引用「${proposal.guardrails.scale_rule}」;所有候选可追溯到账本回执,无候选时维持低频节奏,不编造。
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
  const store = value('--store'), to = value('--to');
  if (!store || !to) throw new Error('Usage: --store LEDGER_DIR --to DATE (requires FEEEYE_OPS_DATA_KEY)');
  const { privateDataKey } = await import('./private_data_crypto.mjs');
  const { reviewContentLifecycle } = await import('./content_lifecycle_review.mjs');
  const lifecycle = reviewContentLifecycle({ store, key: privateDataKey(), to });
  const weeklyInput = { content: [] };
  console.log(proposalMarkdown(buildWeeklyProposal({ store, key: privateDataKey(), to, weeklyInput, lifecycle })));
}
