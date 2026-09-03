#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildOAuthHeader, credentialsFromEnv } from './x_connection_check.mjs';
import { validateAutonomyPolicy } from './autonomy_engine.mjs';
import { readJson, sha256, stable, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const POST_URL='https://api.x.com/2/tweets';
const ME_URL='https://api.x.com/2/users/me';
const EXACT_REQUEST_FIELDS=['schema_version','request_id','channel','target_account','locale','content_type','created_at','not_before','expires_at','text','landing_url','deployment','gates'];
const GATE_FIELDS=['source_current','deployment_verified','bilingual_verified','landing_pages_valid','idempotency_key'];
const REGISTERED_CAMPAIGNS=new Set(['1000-usdt-fee','safe-transfer','usdt-cost-2026-09','feeeye-launch']);
const DAY=86_400_000;

const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error(`Unexpected fields: ${label}`);};
const normalizeText=value=>String(value).replace(/https:\/\/\S+/g,'').replace(/\s+/g,' ').trim();
const xLength=text=>23+[...text.replace(/https:\/\/\S+/g,'')].reduce((n,c)=>n+(c.codePointAt(0)>0x7ff?2:1),0);
const requestIdentity=request=>({request_id:request.request_id,target_account:request.target_account,locale:request.locale,content_type:request.content_type,text:request.text,landing_url:request.landing_url,not_before:request.not_before,expires_at:request.expires_at,deployment:request.deployment});
const idempotencyFor=request=>sha256(stable(requestIdentity(request)));

export function validateXPublishRequest(request, policy) {
  validateAutonomyPolicy(policy);
  exact(request,EXACT_REQUEST_FIELDS,'x request');
  exact(request.deployment,['base_url','build_id','source_revision','verified_at','bilingual_verified_at'],'x request deployment');
  exact(request.gates,GATE_FIELDS,'x request gates');
  if(request.schema_version!==1||request.channel!=='x'||request.target_account!=='FeeEyeOfficial'||!['en','zh'].includes(request.locale)||!/^[a-z0-9-]+$/.test(request.request_id||'')||!policy.allowed_content_types.includes(request.content_type)||policy.blocked_content_types.includes(request.content_type))throw new Error('Invalid X request identity or content type');
  if(!validInstant(request.created_at)||!validInstant(request.not_before)||!validInstant(request.expires_at)||Date.parse(request.not_before)<Date.parse(request.created_at)||Date.parse(request.not_before)-Date.parse(request.created_at)>30*DAY||Date.parse(request.expires_at)-Date.parse(request.not_before)!==15*60_000)throw new Error('Invalid X publication window');
  if(request.deployment.base_url!=='https://feeeye.com'||!/^[a-f0-9]{64}$/.test(request.deployment.build_id||'')||!/^[a-f0-9]{40}$/.test(request.deployment.source_revision||'')||!validInstant(request.deployment.verified_at)||!validInstant(request.deployment.bilingual_verified_at)||Date.parse(request.deployment.verified_at)>Date.parse(request.created_at)||Date.parse(request.deployment.bilingual_verified_at)>Date.parse(request.created_at))throw new Error('Invalid verified deployment binding');
  if(typeof request.text!=='string'||request.text.length<40||xLength(request.text)>280||/(^|[^A-Za-z0-9_])@[A-Za-z0-9_]{1,15}\b/.test(request.text))throw new Error('X text is empty, too long, or contains an automated mention');
  const urls=request.text.match(/https:\/\/\S+/g)||[];
  if(urls.length!==1||urls[0]!==request.landing_url)throw new Error('X text must contain exactly the declared landing URL');
  const landing=new URL(request.landing_url);
  if(landing.origin!=='https://feeeye.com'||landing.username||landing.password||landing.hash||landing.searchParams.get('utm_source')!=='x'||landing.searchParams.get('utm_medium')!=='social'||!REGISTERED_CAMPAIGNS.has(landing.searchParams.get('utm_campaign')))throw new Error('Invalid or unregistered FeeEye landing URL');
  if(JSON.stringify([...landing.searchParams.keys()].sort())!==JSON.stringify(['utm_campaign','utm_medium','utm_source']))throw new Error('Unexpected or repeated landing URL parameter');
  for(const key of GATE_FIELDS.filter(key=>key!=='idempotency_key'))if(request.gates[key]!==true)throw new Error(`Required gate failed: ${key}`);
  if(request.gates.idempotency_key!==idempotencyFor(request))throw new Error('Invalid X idempotency key');
  return request;
}

export function buildXPublishRequest(input, policy) {
  const request={...structuredClone(input),gates:{...structuredClone(input.gates),idempotency_key:''}};
  request.gates.idempotency_key=idempotencyFor(request);
  return validateXPublishRequest(request,policy);
}

export function evaluateXPublishPreflight(request,policy,{now=new Date().toISOString(),liveFlag=false}={}) {
  validateXPublishRequest(request,policy);
  if(!validInstant(now))throw new Error('Invalid preflight time');
  const blockers=[];
  if(policy.mode!=='autonomous')blockers.push('mode_shadow');
  if(policy.publishing_enabled!==true)blockers.push('publishing_disabled');
  if(policy.emergency_stop_engaged)blockers.push('emergency_stop');
  if(policy.channels.x.enabled!==true)blockers.push(policy.channels.x.blocker||'x_channel_disabled');
  if(policy.channels.x.executor!=='official_x_api')blockers.push('unofficial_executor');
  if(policy.budget.monthly_usd_cap<=0||policy.budget.monthly_usd_cap>5)blockers.push('invalid_monthly_cap');
  if(policy.budget.auto_recharge!==false)blockers.push('auto_recharge_forbidden');
  if(!liveFlag)blockers.push('live_flag_disabled');
  if(Date.parse(now)<Date.parse(request.not_before))blockers.push('too_early');
  if(Date.parse(now)>Date.parse(request.expires_at))blockers.push('expired');
  return{request_id:request.request_id,status:blockers.length?'blocked':'dispatch_ready',dispatch_allowed:blockers.length===0,blockers,post_created:false};
}

async function apiRequest(credentials,url,{method='GET',body,fetchImpl=fetch}={}) {
  const options={method,headers:{Accept:'application/json',Authorization:buildOAuthHeader(credentials,{method,url}),'User-Agent':'FeeEye-X-Operations/1.0'},signal:AbortSignal.timeout(15_000)};
  if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
  return fetchImpl(url,options);
}

const samePost=(post,request)=>{
  const expanded=(post?.entities?.urls||[]).some(url=>url.expanded_url===request.landing_url||url.unwound_url===request.landing_url);
  return expanded&&normalizeText(post.text)===normalizeText(request.text);
};

async function recentPosts(credentials,userId,fetchImpl) {
  const url=`https://api.x.com/2/users/${userId}/tweets?max_results=10&exclude=replies%2Cretweets&tweet.fields=created_at%2Centities`;
  const response=await apiRequest(credentials,url,{fetchImpl});
  if(!response.ok)throw new Error(`X reconciliation failed (HTTP ${response.status}). No new publish attempt is allowed.`);
  const payload=await response.json();
  return Array.isArray(payload.data)?payload.data:[];
}

export async function executeXPublish(request,policy,{credentials,fetchImpl=fetch,now=new Date().toISOString(),liveFlag=false}={}) {
  const preflight=evaluateXPublishPreflight(request,policy,{now,liveFlag});
  if(!preflight.dispatch_allowed)throw new Error(`X dispatch blocked: ${preflight.blockers.join(', ')}`);
  const me=await apiRequest(credentials,ME_URL,{fetchImpl});
  if(!me.ok)throw new Error(`X identity check failed (HTTP ${me.status}). No post was created.`);
  const account=(await me.json())?.data;
  if(!account?.id||account.username?.toLowerCase()!=='feeeyeofficial')throw new Error('X identity mismatch. No post was created.');
  let recent=await recentPosts(credentials,account.id,fetchImpl);
  const duplicate=recent.find(post=>samePost(post,request));
  if(duplicate)return{schema_version:1,request_id:request.request_id,idempotency_key:request.gates.idempotency_key,account:'@FeeEyeOfficial',post_url:`https://x.com/FeeEyeOfficial/status/${duplicate.id}`,reconciled:true,post_created:false,recorded_at:now};
  const sevenDaysAgo=Date.parse(now)-7*DAY;
  if(recent.filter(post=>typeof post.created_at==='string'&&Number.isFinite(Date.parse(post.created_at))&&Date.parse(post.created_at)>=sevenDaysAgo).length>=3)throw new Error('X seven-day root-post limit reached. No post was created.');
  let response;
  try {response=await apiRequest(credentials,POST_URL,{method:'POST',body:{text:request.text,made_with_ai:true},fetchImpl});}
  catch {
    recent=await recentPosts(credentials,account.id,fetchImpl);
    const reconciled=recent.find(post=>samePost(post,request));
    if(reconciled)return{schema_version:1,request_id:request.request_id,idempotency_key:request.gates.idempotency_key,account:'@FeeEyeOfficial',post_url:`https://x.com/FeeEyeOfficial/status/${reconciled.id}`,reconciled:true,post_created:false,recorded_at:now};
    throw new Error('X publish outcome is unknown and requires reconciliation. Automatic retry is forbidden.');
  }
  if(response.status!==201){
    recent=await recentPosts(credentials,account.id,fetchImpl);
    const reconciled=recent.find(post=>samePost(post,request));
    if(reconciled)return{schema_version:1,request_id:request.request_id,idempotency_key:request.gates.idempotency_key,account:'@FeeEyeOfficial',post_url:`https://x.com/FeeEyeOfficial/status/${reconciled.id}`,reconciled:true,post_created:false,recorded_at:now};
    throw new Error(`X publish rejected (HTTP ${response.status}); reconciliation found no matching post. Automatic retry is forbidden.`);
  }
  let created;
  try {created=(await response.json())?.data;} catch {}
  if(!/^[0-9]+$/.test(created?.id||'')){
    recent=await recentPosts(credentials,account.id,fetchImpl);
    const reconciled=recent.find(post=>samePost(post,request));
    if(reconciled)return{schema_version:1,request_id:request.request_id,idempotency_key:request.gates.idempotency_key,account:'@FeeEyeOfficial',post_url:`https://x.com/FeeEyeOfficial/status/${reconciled.id}`,reconciled:true,post_created:false,recorded_at:now};
    throw new Error('X publish response lacks a valid post ID; reconciliation found no match and automatic retry is forbidden.');
  }
  return{schema_version:1,request_id:request.request_id,idempotency_key:request.gates.idempotency_key,account:'@FeeEyeOfficial',post_url:`https://x.com/FeeEyeOfficial/status/${created.id}`,reconciled:false,post_created:true,recorded_at:now};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),requestFile=args[args.indexOf('--request')+1],policyFile=args[args.indexOf('--policy')+1]||path.join(root,'ops/automation/autonomy-policy.json');
  if(!requestFile)throw new Error('Usage: --request FILE [--policy FILE] [--execute --out FILE]');
  const request=readJson(requestFile),policy=readJson(policyFile),execute=args.includes('--execute');
  if(!execute){console.log(JSON.stringify(evaluateXPublishPreflight(request,policy,{liveFlag:false}),null,2));}
  else{
    const out=args[args.indexOf('--out')+1];if(!out)throw new Error('--execute requires --out inside ops/automation/working');
    const receipt=await executeXPublish(request,policy,{credentials:credentialsFromEnv(),liveFlag:process.env.FEEEYE_X_PUBLISHING_ENABLED==='enabled'});
    writeNewJson(out,receipt,path.join(root,'ops/automation/working'));console.log(JSON.stringify(receipt));
  }
}
