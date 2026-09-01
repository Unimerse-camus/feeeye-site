#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { snapshot, snapshotHash, digest } from './benchmark.mjs';

export const reviewURL = new URL('../../ops/automation/reviews/spot-source-review-2026-08-31.json',import.meta.url);
const statuses = ['confirmed_in_scope','corroborated_only','scope_warning','unconfirmed','changed'];
const validDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
export function validateReview(r) {
  if(r.schema_version !== 1 || !/^[a-z0-9-]+$/.test(r.id||'') || !validDay(r.observed_at) || !r.method || r.base_snapshot_hash !== snapshotHash) throw new Error('Invalid review identity, date or base snapshot');
  if(!Array.isArray(r.records) || r.records.length !== snapshot.rows.length || new Set(r.records.map(x=>x.slug)).size !== r.records.length) throw new Error('Missing or duplicate review records');
  for(const record of r.records) {
    const base=snapshot.rows.find(x=>x.slug===record.slug);
    if(!base || !statuses.includes(record.status) || !record.scope || !record.evidence_note || !record.next_action || !Array.isArray(record.sources) || !record.sources.length) throw new Error('Incomplete review record');
    if(record.status==='unconfirmed') {
      if(record.rate_ppm!==null || record.kind!=='unknown') throw new Error('Unconfirmed rate must remain unknown');
    } else if(!Number.isSafeInteger(record.rate_ppm) || record.rate_ppm<=0 || record.rate_ppm>100000 || !['published_rate','ceiling'].includes(record.kind)) throw new Error('Invalid candidate rate');
    for(const source of record.sources) {
      const u=new URL(source), host=record.slug+'.com';
      if(u.protocol!=='https:' || u.username || u.password || !(u.hostname===host || u.hostname.endsWith('.'+host))) throw new Error('Non-official review source');
    }
  }
  return r;
}
export const sourceReview=validateReview(JSON.parse(fs.readFileSync(reviewURL,'utf8')));
export const reviewHash=digest(JSON.stringify(sourceReview));
// This is an evidence preflight, never an authorization or an automatic rate updater.
export function assessReview(r=sourceReview, asOf=new Date().toISOString().slice(0,10)) {
  validateReview(r);
  if(!validDay(asOf)) throw new Error('Invalid assessment date');
  const age=(Date.parse(asOf)-Date.parse(r.observed_at))/86400000;
  const issues=[];
  if(age<0) issues.push({slug:'all',reason:'future_observation'});
  if(age>7) issues.push({slug:'all',reason:'review_expired'});
  for(const record of r.records) {
    const base=snapshot.rows.find(x=>x.slug===record.slug);
    if(record.status!=='confirmed_in_scope') issues.push({slug:record.slug,reason:record.status});
    else if(record.rate_ppm!==base.rate_ppm || record.kind!==base.kind) issues.push({slug:record.slug,reason:'snapshot_mismatch'});
  }
  return {review_id:r.id,review_hash:digest(JSON.stringify(r)),snapshot_hash:snapshotHash,as_of:asOf,max_review_age_days:7,confirmed_in_scope:r.records.filter(x=>x.status==='confirmed_in_scope').length,total:r.records.length,current_claims_ready:issues.length===0,publication_allowed:false,human_approval_required:true,issues};
}
export function reviewMarkdown(r=sourceReview,asOf=r.observed_at) {
  const a=assessReview(r,asOf);
  return `# 官方来源审阅与推广前检查\n\n观察日期：${r.observed_at}；评估日期：${asOf}。\n\n状态：${a.current_claims_ready?'证据条件通过，仍需人工审核':'当前费率宣传被拦截'}。${a.confirmed_in_scope}/${a.total}项在限定范围内有公开费率支持。发布许可始终为false。\n\n${r.method}\n\n`+
    r.records.map(x=>`## ${x.slug} — ${x.status}\n\n${x.evidence_note}\n\n适用范围：${x.scope}\n\n下一步：${x.next_action}\n\n${x.sources.map((u,i)=>`[官方来源${i+1}](${u})`).join(' · ')}\n`).join('\n')+
    '\n## 边界\n\n本报告不覆盖地区准入法律核验，不获取账号信息，不创建真实订单，不覆盖旧快照。来源缺失不是费率为0，也不证明费率已发生变化。7天为内部复核上限，不是费率有效期保证。完整性检查不等于事实真实或人工批准。\n';
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.some(x=>x!=='--require-current')) throw new Error('Usage: node build/ops/source_review.mjs [--require-current]');
  const result=assessReview();
  console.log(JSON.stringify(result,null,2));
  if(args.includes('--require-current') && !result.current_claims_ready) process.exitCode=2;
}
