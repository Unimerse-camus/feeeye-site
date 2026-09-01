#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, sha256, stable, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export const STATES=['draft','evidence_ready','reviewed','approved','scheduled','publishing','published','verified','blocked','expired','failed','needs_reconciliation'];
const NEXT={draft:['evidence_ready','blocked'],evidence_ready:['reviewed','blocked','expired'],reviewed:['approved','blocked','expired'],approved:['scheduled','expired'],scheduled:['publishing','expired','failed'],publishing:['published','needs_reconciliation','failed'],published:['verified','needs_reconciliation'],verified:[],blocked:['draft'],expired:['draft'],failed:['scheduled'],needs_reconciliation:['published','failed']};

export function contentHash(campaign,locale) {
  const posts=campaign.posts.filter(p=>p.locale===locale).sort((a,b)=>a.suggested_order-b.suggested_order);
  return sha256(stable({campaign_id:campaign.id,locale,posts}));
}
export function draftItem(campaign,locale) {
  if(!['en','zh'].includes(locale)) throw new Error('Locale must be en or zh');
  const posts=campaign.posts.filter(p=>p.locale===locale).sort((a,b)=>a.suggested_order-b.suggested_order);
  if(posts.length!==3) throw new Error('Expected exactly three posts for one account language');
  return {schema_version:1,id:`${campaign.id}-${locale}`,campaign_id:campaign.id,channel:'x',target_account:'FeeEyeOfficial',locale,status:'draft',content_hash:contentHash(campaign,locale),post_ids:posts.map(p=>p.id),publishing_enabled:false,history:[],review:null,approval:null,schedule:null,receipt:null};
}
export function validateItem(item,campaign) {
  if(item.schema_version!==1 || !/^[a-z0-9-]+$/.test(item.id||'') || item.campaign_id!==campaign.id || item.channel!=='x' || item.target_account!=='FeeEyeOfficial' || !['en','zh'].includes(item.locale) || !STATES.includes(item.status)) throw new Error('Invalid workflow identity');
  if(item.content_hash!==contentHash(campaign,item.locale) || item.publishing_enabled!==false) throw new Error('Stale content or publishing unexpectedly enabled');
  const expected=campaign.posts.filter(p=>p.locale===item.locale).sort((a,b)=>a.suggested_order-b.suggested_order).map(p=>p.id);
  if(JSON.stringify(item.post_ids)!==JSON.stringify(expected) || !Array.isArray(item.history)) throw new Error('Invalid workflow content inventory');
  return item;
}
export function transition(item,next,ctx,campaign) {
  validateItem(item,campaign);
  if(!NEXT[item.status]?.includes(next)) throw new Error(`Transition ${item.status} -> ${next} is not allowed`);
  if(!validInstant(ctx.at)) throw new Error('Transition requires canonical ISO time');
  const out=structuredClone(item), entry={from:item.status,to:next,at:ctx.at,actor:ctx.actor||'system'};
  if(next==='evidence_ready') {
    if(ctx.kind!=='brand_education' || ctx.landing_pages_valid!==true || ctx.attachments_valid!==true) throw new Error('Evidence checks incomplete');
    entry.checks={kind:ctx.kind,landing_pages_valid:true,attachments_valid:true};
  } else if(next==='reviewed') {
    if(ctx.human!==true || !ctx.actor || ctx.reviewed_content_hash!==item.content_hash) throw new Error('Human review must bind the exact content hash');
    out.review={reviewer:ctx.actor,reviewed_at:ctx.at,content_hash:item.content_hash};
  } else if(next==='approved') {
    const a=ctx.approval;
    if(!a || a.explicit!==true || a.actor!==ctx.actor || a.content_hash!==item.content_hash || a.target_account!==item.target_account || a.locale!==item.locale || !Array.isArray(a.post_ids) || JSON.stringify(a.post_ids)!==JSON.stringify(item.post_ids) || !validInstant(a.approved_at) || a.approved_at!==ctx.at) throw new Error('Approval must explicitly bind account, locale, posts and content hash');
    out.approval=a;
  } else if(next==='scheduled') {
    if(item.status==='failed'&&!ctx.reason) throw new Error('Retry schedule requires reason');
    if(!validInstant(ctx.scheduled_at) || Date.parse(ctx.scheduled_at)<=Date.parse(ctx.at) || Date.parse(ctx.scheduled_at)-Date.parse(ctx.at)>30*86400000 || ctx.mode!=='manual_or_native') throw new Error('Invalid schedule');
    out.schedule={scheduled_at:ctx.scheduled_at,mode:ctx.mode};
  } else if(next==='publishing') {
    if(ctx.publishing_enabled!==true || !ctx.session_id) throw new Error('Publishing requires a separately enabled session');
    // Enabling is deliberately not persisted here; the external action module does not exist yet.
    entry.session_id=ctx.session_id;
  } else if(next==='published') {
    if(item.status==='needs_reconciliation'&&!ctx.reason) throw new Error('Reconciliation resolution requires reason');
    if(!ctx.receipt || ctx.receipt.post_ids?.length!==item.post_ids.length || ctx.receipt.urls?.length!==item.post_ids.length || !ctx.receipt.post_ids.every((id,i)=>id===item.post_ids[i]) || !ctx.receipt.urls.every(u=>new RegExp(`^https://x\\.com/${item.target_account}/status/[0-9]+$`,'i').test(u)) || !validInstant(ctx.receipt.recorded_at)) throw new Error('Invalid publishing receipt');
    out.receipt=ctx.receipt;
  } else if(next==='verified') {
    if(!item.receipt || !validInstant(ctx.checked_at) || ctx.publicly_visible!==true) throw new Error('Verification requires public receipt check');
    entry.checked_at=ctx.checked_at;
  } else if(['blocked','expired','failed','needs_reconciliation'].includes(next)) {
    if(!ctx.reason || ctx.reason.length>240) throw new Error('Failure branch requires a concise reason');
    entry.reason=ctx.reason;
  } else if(['draft','scheduled'].includes(next) && !ctx.reason) throw new Error('Recovery requires reason');
  out.status=next; out.history.push(entry);
  return validateItem(out,campaign);
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), locale=args[args.indexOf('--locale')+1];
  const campaign=readJson(path.join(root,'ops/automation/campaigns/x-launch-2026-08-31.json'));
  const item=draftItem(campaign,locale);
  if(args.includes('--write-draft')) {
    const out=args[args.indexOf('--out')+1];
    if(!out) throw new Error('--write-draft requires --out inside ops/automation/working');
    writeNewJson(out,item,path.join(root,'ops/automation/working'));
  }
  console.log(JSON.stringify(item,null,2));
}
