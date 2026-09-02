#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};
const channelIds=['website','x','youtube','reddit'];
export function validateAutonomyPolicy(policy) {
  exact(policy,['schema_version','id','mode','publishing_enabled','per_item_approval_required','emergency_stop_engaged','budget','allowed_content_types','blocked_content_types','required_gates','channels'],'policy');exact(policy.budget,['monthly_usd_cap','auto_recharge'],'budget');exact(policy.channels,channelIds,'channels');
  if(policy.schema_version!==1||policy.id!=='feeeye-autonomy-v1'||!['shadow','autonomous'].includes(policy.mode)||typeof policy.publishing_enabled!=='boolean'||policy.per_item_approval_required!==false||typeof policy.emergency_stop_engaged!=='boolean'||!Number.isFinite(policy.budget.monthly_usd_cap)||policy.budget.monthly_usd_cap<0||policy.budget.auto_recharge!==false)throw new Error('Invalid autonomy policy');
  if(!Array.isArray(policy.allowed_content_types)||!Array.isArray(policy.blocked_content_types)||!Array.isArray(policy.required_gates)||policy.required_gates.join(',')!=='source_current,deployment_verified,bilingual_verified,landing_pages_valid,idempotency_key')throw new Error('Invalid autonomy gates');
  const executors={website:'github_pr_auto_merge',x:'official_x_api',youtube:'official_youtube_api',reddit:'official_reddit_api'};
  for(const id of channelIds){const value=policy.channels[id];exact(value,['enabled','executor','blocker'],'channel.'+id);if(typeof value.enabled!=='boolean'||value.executor!==executors[id]||typeof value.blocker!=='string')throw new Error('Unofficial or invalid channel executor');}
  if(policy.channels.x.enabled&&policy.budget.monthly_usd_cap<=0)throw new Error('X automation requires a positive spending cap');
  return policy;
}
export function evaluateAutonomousCycle(policy,state) {
  validateAutonomyPolicy(policy);exact(state,['schema_version','cycle_id','created_at','content_type','topic_id','gates','channels'],'cycle');exact(state.gates,policy.required_gates,'cycle.gates');exact(state.channels,channelIds,'cycle.channels');
  if(state.schema_version!==1||!/^[a-z0-9-]+$/.test(state.cycle_id||'')||!/^[a-z0-9-]+$/.test(state.topic_id||'')||!validInstant(state.created_at)||!policy.allowed_content_types.includes(state.content_type)||policy.blocked_content_types.includes(state.content_type))throw new Error('Invalid autonomous cycle identity or content type');
  for(const gate of policy.required_gates)if(gate==='idempotency_key'? !/^[a-f0-9]{64}$/.test(state.gates[gate]||''):typeof state.gates[gate]!=='boolean')throw new Error('Invalid autonomous gate: '+gate);
  const global=[];if(policy.mode!=='autonomous')global.push('mode_shadow');if(!policy.publishing_enabled)global.push('publishing_disabled');if(policy.emergency_stop_engaged)global.push('emergency_stop');for(const gate of policy.required_gates.filter(x=>x!=='idempotency_key'))if(state.gates[gate]!==true)global.push(gate+'_failed');
  const channels=channelIds.map(id=>{const configured=policy.channels[id],live=state.channels[id];exact(live,['credentials_ready','api_ready','quota_ready','platform_approval_ready'],'cycle.channel.'+id);const blockers=[...global];if(!configured.enabled)blockers.push(configured.blocker);for(const key of Object.keys(live))if(live[key]!==true)blockers.push(key+'_false');return{id,executor:configured.executor,status:blockers.length?'blocked':'dispatch_ready',dispatch_allowed:blockers.length===0,blockers};});
  return{schema_version:1,cycle_id:state.cycle_id,status:channels.some(x=>x.dispatch_allowed)?'ready':policy.mode==='shadow'?'shadow':'blocked',per_item_approval_required:false,automatic_decision:true,channels};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),state=args[args.indexOf('--state')+1];if(!state)throw new Error('Usage: --state FILE [--policy FILE] [--out FILE]');const policyIndex=args.indexOf('--policy'),policy=readJson(policyIndex>=0?args[policyIndex+1]:path.join(root,'ops/automation/autonomy-policy.json')),result=evaluateAutonomousCycle(policy,readJson(state)),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],result,path.join(root,'ops/automation/working'));console.log(JSON.stringify(result,null,2));}
