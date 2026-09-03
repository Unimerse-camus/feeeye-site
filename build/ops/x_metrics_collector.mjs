#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildOAuthHeader, credentialsFromEnv } from './x_connection_check.mjs';
import { stable, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const DAY=86_400_000;
const CHECKPOINTS=[['24h',1],['7d',7],['28d',28]];
const METRIC_FIELDS=['impressions','likes','replies','reposts','quotes','bookmarks','engagements','url_clicks','profile_clicks'];
const RECEIPT_FIELDS=['schema_version','request_id','idempotency_key','account','post_url','reconciled','post_created','recorded_at'];
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error(`Unexpected fields: ${label}`);};
const numberOrNull=value=>Number.isSafeInteger(value)&&value>=0?value:null;

function validateReceipt(receipt) {
  exact(receipt,RECEIPT_FIELDS,'X receipt');
  if(receipt.schema_version!==1||receipt.account!=='@FeeEyeOfficial'||!/^https:\/\/x\.com\/FeeEyeOfficial\/status\/[0-9]+$/.test(receipt.post_url||'')||!/^[a-f0-9]{64}$/.test(receipt.idempotency_key||'')||!validInstant(receipt.recorded_at))throw new Error('Invalid X receipt in metrics ledger');
  return receipt;
}

export function listReceipts(storeRoot) {
  const dir=path.join(path.resolve(storeRoot),'x');if(!fs.existsSync(dir))return[];
  return fs.readdirSync(dir).filter(name=>/^[a-f0-9]{64}\.json$/.test(name)).sort().map(name=>validateReceipt(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))));
}

export function dueMetrics(receipts,storeRoot,now=new Date().toISOString()) {
  if(!validInstant(now))throw new Error('Canonical metrics time is required');
  const due=[];
  for(const receipt of receipts){
    for(const [checkpoint,days] of CHECKPOINTS){
      const dueAt=new Date(Date.parse(receipt.recorded_at)+days*DAY).toISOString(),file=path.join(path.resolve(storeRoot),'x-metrics',receipt.idempotency_key,`${checkpoint}.json`);
      if(Date.parse(now)>=Date.parse(dueAt)&&!fs.existsSync(file)){due.push({receipt,checkpoint,due_at:dueAt,file});break;}
    }
  }
  return due.sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at)||a.receipt.idempotency_key.localeCompare(b.receipt.idempotency_key));
}

function metricsFromPost(post) {
  const pub=post.public_metrics||{},priv=post.non_public_metrics||{};
  return{
    impressions:numberOrNull(pub.impression_count??priv.impression_count),
    likes:numberOrNull(pub.like_count),replies:numberOrNull(pub.reply_count),reposts:numberOrNull(pub.retweet_count),quotes:numberOrNull(pub.quote_count),bookmarks:numberOrNull(pub.bookmark_count),
    engagements:numberOrNull(priv.engagements),url_clicks:numberOrNull(priv.url_link_clicks),profile_clicks:numberOrNull(priv.user_profile_clicks)
  };
}

async function get(credentials,url,fetchImpl) {
  return fetchImpl(url,{method:'GET',headers:{Accept:'application/json',Authorization:buildOAuthHeader(credentials,{url}),'User-Agent':'FeeEye-X-Metrics/1.0'},signal:AbortSignal.timeout(15_000)});
}

export async function collectDueMetrics({storeRoot,credentials,now=new Date().toISOString(),maxPosts=3,fetchImpl=fetch}) {
  if(!Number.isInteger(maxPosts)||maxPosts<1||maxPosts>3)throw new Error('Metrics post cap must be 1 to 3');
  const due=dueMetrics(listReceipts(storeRoot),storeRoot,now).slice(0,maxPosts);
  if(!due.length)return{schema_version:1,status:'no_due_checkpoints',observed_at:now,api_reads:0,snapshots:[]};
  const me=await get(credentials,'https://api.x.com/2/users/me',fetchImpl);
  if(!me.ok)throw new Error(`X metrics identity check failed (HTTP ${me.status})`);
  const account=(await me.json())?.data;if(!account?.id||account.username?.toLowerCase()!=='feeeyeofficial')throw new Error('X metrics identity mismatch');
  const snapshots=[];
  for(const item of due){
    const postId=item.receipt.post_url.split('/').at(-1),url=`https://api.x.com/2/tweets/${postId}?tweet.fields=created_at%2Cpublic_metrics%2Cnon_public_metrics%2Corganic_metrics`;
    const response=await get(credentials,url,fetchImpl);if(!response.ok)throw new Error(`X metrics lookup failed (HTTP ${response.status})`);
    const post=(await response.json())?.data;if(post?.id!==postId)throw new Error('X metrics response post mismatch');
    const metrics=metricsFromPost(post),missing=METRIC_FIELDS.filter(field=>metrics[field]===null);
    const snapshot={schema_version:1,account:'@FeeEyeOfficial',request_id:item.receipt.request_id,idempotency_key:item.receipt.idempotency_key,post_url:item.receipt.post_url,checkpoint:item.checkpoint,due_at:item.due_at,observed_at:now,lag_minutes:Math.floor((Date.parse(now)-Date.parse(item.due_at))/60_000),metrics,missing_fields:missing};
    fs.mkdirSync(path.dirname(item.file),{recursive:true});fs.writeFileSync(item.file,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx',mode:0o600});snapshots.push(snapshot);
  }
  return{schema_version:1,status:'collected',observed_at:now,api_reads:1+snapshots.length,snapshots:snapshots.map(item=>({post_url:item.post_url,checkpoint:item.checkpoint,due_at:item.due_at,observed_at:item.observed_at,missing_fields:item.missing_fields}))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),value=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:null;},store=value('--store'),out=value('--out'),cap=Number(value('--max-posts')||3);
  if(!store||!out)throw new Error('Usage: --store DIR --out FILE [--max-posts 1..3]');
  const report=await collectDueMetrics({storeRoot:store,credentials:credentialsFromEnv(),maxPosts:cap});writeNewJson(out,report,path.join(root,'ops/automation/working'));console.log(JSON.stringify(report));
}
