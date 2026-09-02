#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { contentHash } from './workflow_state.mjs';
import { readJson, sha256, stable, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const DAY=86400000;
const OFFSETS=[0,2,5];
const CHECKPOINTS=[['receipt',0],['24h',1],['7d',7],['28d',28]];
const REQUIRED_VERIFIED_PATHS=['/','/learn/','/learn/crypto-total-cost','/learn/safe-crypto-transfer','/tools/total-cost-calculator.html','/zh/learn/'];
const xLength=text=>23+[...text.replace(/https:\/\/\S+/g,'')].reduce((n,c)=>n+(c.codePointAt(0)>0x7ff?2:1),0);
const instant=(base,days)=>new Date(Date.parse(base)+days*DAY).toISOString();

function landingPath(url) {
  let pathname=url.pathname;
  if(pathname.endsWith('/')) pathname+='index.html';
  else if(!path.extname(pathname)) pathname+='.html';
  return pathname.replace(/^\//,'');
}
function postUrl(post,campaignId,dist) {
  const matches=post.text.match(/https:\/\/\S+/g)||[];
  if(matches.length!==1) throw new Error('Each post must contain exactly one URL');
  const url=new URL(matches[0]);
  if(url.origin!=='https://feeeye.com' || url.username || url.password || url.hash) throw new Error('Landing URL must use the canonical FeeEye origin');
  const keys=[...url.searchParams.keys()].sort();
  if(JSON.stringify(keys)!==JSON.stringify(['utm_campaign','utm_medium','utm_source'])) throw new Error('Landing URL must contain only the registered UTM tuple');
  if(url.searchParams.get('utm_source')!=='x' || url.searchParams.get('utm_medium')!=='social' || url.searchParams.get('utm_campaign')!==campaignId) throw new Error('Unregistered X campaign tuple');
  if(!fs.existsSync(path.join(dist,landingPath(url)))) throw new Error('Landing page is missing from the validated build');
  return url;
}
function validateVerification(verification) {
  const covered=new Set((verification?.checks||[]).filter(x=>x.ok===true).map(x=>x.pathname));
  if(verification?.schema_version!==1 || verification.status!=='verified' || verification.base_url!=='https://feeeye.com' || !/^[a-f0-9]{64}$/.test(verification.build_id||'') || !/^[a-f0-9]{40}$/.test(verification.source_revision||'') || !validInstant(verification.checked_at) || !Array.isArray(verification.checks) || verification.checks.some(x=>x.ok!==true) || REQUIRED_VERIFIED_PATHS.some(x=>!covered.has(x))) throw new Error('A successful production verification receipt with source revision is required');
  return verification;
}
function validateBilingualVerification(bilingual,verification) {
  if(bilingual?.schema_version!==1||bilingual.status!=='verified'||bilingual.distribution_allowed!==true||bilingual.failed_count!==0||bilingual.build_id!==verification.build_id||bilingual.source_revision!==verification.source_revision||!validInstant(bilingual.checked_at)||!Array.isArray(bilingual.results)||bilingual.results.some(x=>x.status!=='passed'))throw new Error('Matching bilingual production verification is required');
  return bilingual;
}
export function buildDistributionPlan({campaign,locale,startAt,verification,bilingualVerification,createdAt=new Date().toISOString(),dist=path.join(root,'dist')}) {
  validateVerification(verification);
  validateBilingualVerification(bilingualVerification,verification);
  const localRelease=readJson(path.join(dist,'release.json'));
  if(localRelease.build_id!==verification.build_id) throw new Error('Validated local build does not match the production receipt');
  if(!['en','zh'].includes(locale) || !validInstant(startAt) || !validInstant(createdAt)) throw new Error('Invalid locale or schedule time');
  const lead=Date.parse(startAt)-Date.parse(createdAt);
  if(lead<=0 || lead>30*DAY) throw new Error('Schedule must start within 30 days after plan creation');
  if(campaign?.id!=='feeeye-launch' || campaign.status!=='draft' || campaign.publishing_enabled!==false || campaign.approval!==null) throw new Error('Campaign must remain an unapproved, publishing-disabled draft');
  const posts=campaign.posts.filter(p=>p.locale===locale).sort((a,b)=>a.suggested_order-b.suggested_order);
  if(posts.length!==3 || new Set(posts.map(p=>p.id)).size!==3) throw new Error('Expected three unique posts for one account language');
  const hash=contentHash(campaign,locale);
  const items=posts.map((post,index)=>{
    const url=postUrl(post,campaign.id,dist);
    if(post.suggested_order!==index+1 || xLength(post.text)>280) throw new Error('Invalid post order or X length');
    if(post.image && !fs.existsSync(path.join(root,post.image))) throw new Error('Referenced post image is missing');
    const scheduledAt=instant(startAt,OFFSETS[index]);
    const identity={campaign_id:campaign.id,channel:'x',locale,post_id:post.id,content_hash:hash,build_id:verification.build_id,scheduled_at:scheduledAt};
    return {id:post.id,order:index+1,scheduled_at:scheduledAt,text:post.text,image:post.image,landing_url:url.toString(),utm:{source:'x',medium:'social',campaign:campaign.id},idempotency_key:sha256(stable(identity)),checkpoints:CHECKPOINTS.map(([kind,days])=>({kind,due_at:instant(scheduledAt,days)}))};
  });
  return {schema_version:1,id:`${campaign.id}-x-${locale}`,status:'draft',publishing_enabled:false,created_at:createdAt,campaign_id:campaign.id,channel:'x',target_account:'FeeEyeOfficial',locale,content_hash:hash,deployment:{base_url:verification.base_url,build_id:verification.build_id,source_revision:verification.source_revision,verified_at:verification.checked_at,bilingual_verified_at:bilingualVerification.checked_at},policy:{delivery_mode:'manual_or_native',max_posts_per_7_days:3,automatic_replies:false,automatic_likes:false,automatic_direct_messages:false},items};
}
export function validateDistributionPlan(plan,{campaign,verification,bilingualVerification,dist=path.join(root,'dist')}) {
  const rebuilt=buildDistributionPlan({campaign,locale:plan.locale,startAt:plan.items?.[0]?.scheduled_at,verification,bilingualVerification,createdAt:plan.created_at,dist});
  if(stable(plan)!==stable(rebuilt)) throw new Error('Distribution plan is stale or has been modified');
  return plan;
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), locale=args[args.indexOf('--locale')+1], startAt=args[args.indexOf('--start-at')+1], verificationFile=args[args.indexOf('--verification')+1], bilingualFile=args[args.indexOf('--bilingual-verification')+1];
  if(!locale || !startAt || !verificationFile || !bilingualFile) throw new Error('Usage: --locale en|zh --start-at ISO --verification FILE --bilingual-verification FILE [--out FILE]');
  const campaign=readJson(path.join(root,'ops/automation/campaigns/x-launch-2026-08-31.json'));
  const plan=buildDistributionPlan({campaign,locale,startAt,verification:readJson(verificationFile),bilingualVerification:readJson(bilingualFile)});
  const out=args.indexOf('--out');
  if(out>=0) writeNewJson(args[out+1],plan,path.join(root,'ops/automation/working'));
  console.log(JSON.stringify(plan,null,2));
}
