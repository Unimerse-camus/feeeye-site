#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildXPublishRequest, evaluateXPublishPreflight, executeXPublish, validateXPublishRequest } from './x_publish_executor.mjs';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),basePolicy=readJson(path.join(root,'ops/automation/autonomy-policy.json'));
const now='2026-09-03T07:00:00.000Z';
const input={schema_version:1,request_id:'safe-transfer-en-001',channel:'x',target_account:'FeeEyeOfficial',locale:'en',content_type:'evergreen_safety',created_at:'2026-09-03T06:30:00.000Z',not_before:'2026-09-03T07:00:00.000Z',expires_at:'2026-09-03T07:15:00.000Z',text:'Before sending crypto, verify the asset, network, address, and required memo. Use the full checklist.\nhttps://feeeye.com/learn/safe-crypto-transfer?utm_source=x&utm_medium=social&utm_campaign=safe-transfer',landing_url:'https://feeeye.com/learn/safe-crypto-transfer?utm_source=x&utm_medium=social&utm_campaign=safe-transfer',deployment:{base_url:'https://feeeye.com',build_id:'a'.repeat(64),source_revision:'b'.repeat(40),verified_at:'2026-09-03T06:00:00.000Z',bilingual_verified_at:'2026-09-03T06:05:00.000Z'},gates:{source_current:true,deployment_verified:true,bilingual_verified:true,landing_pages_valid:true}};
const request=buildXPublishRequest(input,basePolicy);validateXPublishRequest(request,basePolicy);assert.match(request.gates.idempotency_key,/^[a-f0-9]{64}$/);
const shadow=evaluateXPublishPreflight(request,basePolicy,{now,liveFlag:false});assert.equal(shadow.dispatch_allowed,false);assert.deepEqual(shadow.blockers,['mode_shadow','publishing_disabled','live_trial_and_persistent_receipts_required','live_flag_disabled']);
const active=structuredClone(basePolicy);active.mode='autonomous';active.publishing_enabled=true;active.channels.x={enabled:true,executor:'official_x_api',blocker:''};
assert.equal(evaluateXPublishPreflight(request,active,{now,liveFlag:true}).status,'dispatch_ready');
const modified=structuredClone(request);modified.text=modified.text.replace('full checklist','checklist');assert.throws(()=>validateXPublishRequest(modified,active),/idempotency/);
const mention=structuredClone(input);mention.text=mention.text.replace('Before','@someone Before');assert.throws(()=>buildXPublishRequest(mention,active),/mention/);
const foreign=structuredClone(input);foreign.text=foreign.text.replaceAll('https://feeeye.com','https://example.com');foreign.landing_url=foreign.landing_url.replace('https://feeeye.com','https://example.com');assert.throws(()=>buildXPublishRequest(foreign,active),/landing URL/);
const unknownCampaign=structuredClone(input);unknownCampaign.text=unknownCampaign.text.replaceAll('safe-transfer','unknown-campaign');unknownCampaign.landing_url=unknownCampaign.landing_url.replaceAll('safe-transfer','unknown-campaign');assert.throws(()=>buildXPublishRequest(unknownCampaign,active),/unregistered/);
const repeatedUtm=structuredClone(input);repeatedUtm.text+= '&utm_source=x';repeatedUtm.landing_url+='&utm_source=x';assert.throws(()=>buildXPublishRequest(repeatedUtm,active),/repeated landing/);
const credentials={consumerKey:'key',consumerSecret:'secret',accessToken:'token',accessTokenSecret:'token-secret'};
const responses=[
  {ok:true,status:200,json:async()=>({data:{id:'33391143',username:'FeeEyeOfficial'}})},
  {ok:true,status:200,json:async()=>({data:[]})},
  {ok:true,status:201,json:async()=>({data:{id:'1234567890123456789',text:request.text}})}
];
const calls=[];const fetchImpl=async(url,options)=>{calls.push({url,options});return responses.shift();};
const receipt=await executeXPublish(request,active,{credentials,fetchImpl,now,liveFlag:true});assert.equal(receipt.post_created,true);assert.equal(receipt.post_url,'https://x.com/FeeEyeOfficial/status/1234567890123456789');assert.equal(calls.length,3);assert.equal(calls[2].options.method,'POST');assert.deepEqual(JSON.parse(calls[2].options.body),{text:request.text,made_with_ai:true});assert.doesNotMatch(calls[2].options.headers.Authorization,/secret|token-secret/);
const tcoText=request.text.replace(request.landing_url,'https://t.co/abc123');
const duplicateFetch=async(url)=>url.endsWith('/users/me')?{ok:true,status:200,json:async()=>({data:{id:'33391143',username:'FeeEyeOfficial'}})}:{ok:true,status:200,json:async()=>({data:[{id:'987654321',text:tcoText,created_at:'2026-09-03T07:01:00.000Z',entities:{urls:[{url:'https://t.co/abc123',expanded_url:request.landing_url}]}}]})};
const duplicateReceipt=await executeXPublish(request,active,{credentials,fetchImpl:duplicateFetch,now,liveFlag:true});assert.equal(duplicateReceipt.reconciled,true);assert.equal(duplicateReceipt.post_created,false);
const threePosts=Array.from({length:3},(_,i)=>({id:String(i+1),text:`Different educational update ${i}`,created_at:'2026-09-02T07:00:00.000Z',entities:{urls:[]}}));let rateCall=0;const rateFetch=async()=>++rateCall===1?{ok:true,status:200,json:async()=>({data:{id:'33391143',username:'FeeEyeOfficial'}})}:{ok:true,status:200,json:async()=>({data:threePosts})};
await assert.rejects(executeXPublish(request,active,{credentials,fetchImpl:rateFetch,now,liveFlag:true}),/seven-day root-post limit/);
await assert.rejects(executeXPublish(request,active,{credentials,fetchImpl:async()=>({ok:true,status:200,json:async()=>({data:{id:'1',username:'WrongAccount'}})}),now,liveFlag:true}),/identity mismatch/);
console.log('[OK] X publisher: exact account, official endpoint, 15-minute window, verified FeeEye URL, no mentions, AI disclosure, duplicate reconciliation, 3-per-7-day cap, idempotency, and fail-closed live gate.');
