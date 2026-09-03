#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDueMetrics, dueMetrics, listReceipts } from './x_metrics_collector.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),workflow=fs.readFileSync(path.join(root,'.github/workflows/x-metrics.yml'),'utf8');
assert.match(workflow,/cron: '7 8 \* \* \*'/);assert.match(workflow,/vars\.FEEEYE_X_METRICS == 'enabled'/);assert.match(workflow,/group: x-receipt-ledger/);assert.match(workflow,/--max-posts 3/);assert.doesNotMatch(workflow,/POST \/2\/tweets|--execute/);
const store=fs.mkdtempSync(path.join(os.tmpdir(),'feeeye-x-metrics-')),key='a'.repeat(64),receipt={schema_version:1,request_id:'transfer-en-test',idempotency_key:key,account:'@FeeEyeOfficial',post_url:'https://x.com/FeeEyeOfficial/status/2095418661246800236',reconciled:false,post_created:true,recorded_at:'2026-09-03T07:48:34.062Z'};
fs.mkdirSync(path.join(store,'x'),{recursive:true});fs.writeFileSync(path.join(store,'x',`${key}.json`),JSON.stringify(receipt));
assert.deepEqual(listReceipts(store),[receipt]);assert.equal(dueMetrics([receipt],store,'2026-09-04T07:48:33.062Z').length,0);assert.equal(dueMetrics([receipt],store,'2026-09-04T07:48:34.062Z')[0].checkpoint,'24h');
const credentials={consumerKey:'key',consumerSecret:'secret',accessToken:'token',accessTokenSecret:'token-secret'},calls=[];
const fetchImpl=async url=>{
  calls.push(url);
  if(calls.length===1)return{ok:true,status:200,json:async()=>({data:{id:'33391143',username:'FeeEyeOfficial'}})};
  return{ok:true,status:200,json:async()=>({data:{id:'2095418661246800236',created_at:'2026-09-03T07:48:34.000Z',public_metrics:{impression_count:100,like_count:2,reply_count:1,retweet_count:0,quote_count:0,bookmark_count:3},non_public_metrics:{engagements:8,url_link_clicks:4}}})};
};
const now='2026-09-04T08:00:34.062Z',report=await collectDueMetrics({storeRoot:store,credentials,now,fetchImpl});assert.equal(report.status,'collected');assert.equal(report.api_reads,2);assert.equal(report.snapshots[0].checkpoint,'24h');assert.equal(calls.length,2);assert.match(calls[1],/\/2\/tweets\/2095418661246800236\?tweet\.fields=/);
const snapshot=JSON.parse(fs.readFileSync(path.join(store,'x-metrics',key,'24h.json'),'utf8'));assert.equal(snapshot.metrics.impressions,100);assert.equal(snapshot.metrics.url_clicks,4);assert.equal(snapshot.metrics.profile_clicks,null);assert.deepEqual(snapshot.missing_fields,['profile_clicks']);assert.equal(snapshot.lag_minutes,12);
let repeatedCalls=0;const repeated=await collectDueMetrics({storeRoot:store,credentials,now,fetchImpl:async()=>{repeatedCalls++;throw new Error('must not call');}});assert.equal(repeated.status,'no_due_checkpoints');assert.equal(repeatedCalls,0);
assert.equal(dueMetrics([receipt],store,'2026-09-10T07:48:34.062Z')[0].checkpoint,'7d');await assert.rejects(collectDueMetrics({storeRoot:store,credentials,now,maxPosts:4,fetchImpl}),/1 to 3/);
console.log('[OK] X metrics: only due checkpoints call the API, exact account/post binding, aggregate fields, missing-is-null, append-only snapshots, bounded reads, and 24h/7d/28d schedule.');
