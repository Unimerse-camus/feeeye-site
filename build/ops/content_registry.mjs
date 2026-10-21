#!/usr/bin/env node
// Phase 30 — 内容生命周期登记表。
// 账本 content-registry/<content_id>.json(明文、append-only、写一次不可改):
// 登记站内编辑性内容(benchmark/学习文章,postdeploy 自动)与人工渠道内容
// (YouTube/社区,--register 手动)。X 帖不需要登记——发布回执本身就是登记。
// 登记只记录「什么内容、什么地址、哪天发布」;效果数据由 lifecycle review
// 在检查点到期时从 GSC/X 指标回执里现查,不落登记表。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, sha256, stable, validDay } from './ops_util.mjs';

const REGISTRY_FIELDS = ['channel', 'checkpoints', 'content_id', 'landing_url', 'notes', 'published_at', 'registered_at', 'schema_version', 'source'];
const CHANNELS = ['site', 'youtube', 'community'];
const CHECKPOINTS = ['7d', '28d'];
const exact = (value, keys, label) => { if (!value || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys.slice().sort())) throw new Error(`Unexpected fields: ${label}`); };

export function validateContentRegistration(entry) {
  exact(entry, REGISTRY_FIELDS, 'content registration');
  if (entry.schema_version !== 1 || !CHANNELS.includes(entry.channel) || !/^[a-z0-9-]{4,120}$/.test(entry.content_id || '') || !['postdeploy', 'manual'].includes(entry.source) || !validDay(entry.published_at) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(entry.registered_at || '')) throw new Error('Invalid content registration');
  if (JSON.stringify(entry.checkpoints) !== JSON.stringify(CHECKPOINTS)) throw new Error('Invalid checkpoints');
  const landing = new URL(entry.landing_url || 'http://invalid');
  if (landing.protocol !== 'https:' || !/^([a-z0-9-]+\.)?[a-z0-9-]+\.[a-z]{2,}$/.test(landing.hostname)) throw new Error('Invalid landing URL');
  // 站内内容必须是干净的 feeeye.com 规范地址;外部渠道(YouTube watch?v= 等)允许查询串。
  if (entry.channel === 'site' && (landing.hostname.replace(/^www\./, '') !== 'feeeye.com' || landing.search || landing.hash)) throw new Error('Site content must land on a clean feeeye.com URL');
  if (!Array.isArray(entry.notes) || entry.notes.some(note => typeof note !== 'string' || note.length > 240)) throw new Error('Invalid registration note');
  return entry;
}

export function registrationPath(store, contentId) {
  if (!/^[a-z0-9-]{4,120}$/.test(contentId || '')) throw new Error('Invalid content id');
  return path.join(path.resolve(store), 'content-registry', `${contentId}.json`);
}

export function recordContentRegistration(store, entry) {
  validateContentRegistration(entry);
  const file = registrationPath(store, entry.content_id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = JSON.stringify(entry, null, 2) + '\n';
  try { fs.writeFileSync(file, body, { flag: 'wx', mode: 0o644 }); return { created: true, file }; }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (stable(readJson(file)) !== stable(entry)) throw new Error('Registration already exists with different immutable content');
    return { created: false, file };
  }
}

export function loadContentRegistry(store) {
  const dir = path.join(path.resolve(store), 'content-registry');
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir).filter(name => /^[a-z0-9-]{4,120}\.json$/.test(name)).sort().map(name => {
    const entry = readJson(path.join(dir, name));
    validateContentRegistration(entry);
    if (`${entry.content_id}.json` !== name) throw new Error('Registry path mismatch');
    return entry;
  });
  return entries;
}

// URL 归一化:去 query/hash、去尾斜杠、去 .html,用于 GSC 行与登记地址互相匹配。
export function normalizeLandingUrl(url) {
  const parsed = new URL(url);
  let pathname = parsed.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  if (pathname === '') pathname = '/';
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}`;
}

// 编辑性内容范围:只有 research / learn 页参与生命周期复盘;where-to-buy、
// 币页、国家页等程序化数据页每日随快照变化,登记它们只会制造噪声。
export const EDITORIAL_PATH_PATTERN = /^\/(zh\/)?(research|learn)\/./;

export function slugFromUrl(url) {
  const parsed = new URL(url);
  const slug = parsed.pathname.replace(/^\/zh\//, 'zh-').replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug || 'root';
}

// 从部署差异推导登记项:新增或实质变更(sha256 变)的编辑页 → 以部署日为发布日登记。
// 同一天重复部署同一内容 → content_id 相同 → 幂等;次日的实质再变更 → 新 content_id。
export function registrationsFromDelta(delta, { today, registeredAt, source = 'postdeploy' }) {
  if (!validDay(today)) throw new Error('Invalid registration date');
  const changedSet = new Set(delta.changed);
  const editorial = [...delta.created, ...delta.changed].filter(url => EDITORIAL_PATH_PATTERN.test(new URL(url).pathname));
  return editorial.map(url => ({
    schema_version: 1,
    content_id: `site-${slugFromUrl(url)}-${today}`,
    channel: 'site',
    landing_url: normalizeLandingUrl(url),
    published_at: today,
    checkpoints: ['7d', '28d'],
    source,
    registered_at: registeredAt,
    notes: changedSet.has(url) ? ['republished: content hash changed'] : []
  })).map(entry => validateContentRegistration(entry));
}

// 基线 = 最近一次记录的清单(不论 build 是否相同):同树重复部署时 delta 自身返回空,
// 不会重复登记;绝不能排除同 build 清单,否则会回退成"无基线"导致全量重登记。
export function deploymentBaseline(priorManifests, currentManifest) {
  return [...priorManifests].reverse().find(candidate => candidate.host === currentManifest.host) || null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
  const store = value('--store');
  if (!store) throw new Error('Usage: --store LEDGER_DIR (--register --input FILE | --register-deployment --dist DIR --today DATE [--previous FILE])');
  if (args.includes('--register')) {
    const result = recordContentRegistration(store, readJson(value('--input')));
    console.log(JSON.stringify({ registered: true, created: result.created, file: path.relative(path.resolve(store), result.file) }));
  } else if (args.includes('--register-deployment')) {
    const { buildManifest, delta } = await import('./deployment_manifest.mjs');
    const manifest = buildManifest(value('--dist') || path.join(fileURLToPath(new URL('../../', import.meta.url)), 'dist'));
    const now = new Date().toISOString(), today = value('--today') || now.slice(0, 10);
    const envelope = { schema_version: 1, recorded_at: now, manifest };
    const deploymentsDir = path.join(path.resolve(store), 'deployments');
    const previousFiles = fs.existsSync(deploymentsDir) ? fs.readdirSync(deploymentsDir).filter(name => /^[0-9TZ-]+-[a-f0-9]{12}\.json$/.test(name)).sort() : [];
    const priorManifests = previousFiles.map(name => readJson(path.join(deploymentsDir, name)).manifest);
    const previousForDelta = deploymentBaseline(priorManifests, manifest);
    const deploymentDelta = delta(manifest, previousForDelta);
    const entries = registrationsFromDelta(deploymentDelta, { today, registeredAt: now });
    const target = path.join(deploymentsDir, `${now.replace(/[:.]/g, '')}-${manifest.build_id.slice(0, 12)}.json`);
    fs.mkdirSync(deploymentsDir, { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(envelope, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
    const created = entries.map(entry => recordContentRegistration(store, entry).created);
    console.log(JSON.stringify({ deployment_recorded: path.relative(path.resolve(store), target), registrations: entries.length, created: created.filter(Boolean).length, delta: { created: deploymentDelta.created.length, changed: deploymentDelta.changed.length, deleted: deploymentDelta.deleted.length } }));
  } else {
    throw new Error('Provide --register or --register-deployment');
  }
}
