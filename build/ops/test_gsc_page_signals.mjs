#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectGscPageSignals, gscCredentials, gscProperty, gscWindow, recordGscSignals } from './gsc_page_signals.mjs';
import { buildPageOpportunityQueue } from './page_opportunity_queue.mjs';
import { readEncryptedJson } from './private_data_crypto.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),workflow=fs.readFileSync(path.join(root,'.github/workflows/search-signals-gsc.yml'),'utf8');
assert.match(workflow,/cron: '17 2 \* \* 1'/);assert.match(workflow,/vars\.FEEEYE_GSC == 'enabled'/);assert.match(workflow,/group: x-receipt-ledger/);assert.match(workflow,/gsc-page-opportunities\.json\.enc/);assert.doesNotMatch(workflow,/IndexNow|dimensions.*query|webmasters(?!\.readonly)/);
assert.deepEqual(gscWindow('2026-09-03T12:00:00.000Z'),{from:'2026-08-04',to:'2026-08-31'});assert.throws(()=>gscCredentials({}),/Missing GSC secrets/);assert.equal(gscProperty({}),'https://feeeye.com/');assert.equal(gscProperty({FEEEYE_GSC_SITE_URL:'sc-domain:feeeye.com'}),'sc-domain:feeeye.com');assert.throws(()=>gscProperty({FEEEYE_GSC_SITE_URL:'https://example.com/'}),/exact FeeEye/);
const credentials={clientId:'client',clientSecret:'secret',refreshToken:'refresh'},calls=[];
const rows=[
  {keys:['https://feeeye.com/zh/'],clicks:1,impressions:80,ctr:.0125,position:4.24},
  {keys:['https://feeeye.com/compare/binance-vs-okx.html'],clicks:0,impressions:40,ctr:0,position:22.29},
  {keys:['https://feeeye.com/learn/?user=1'],clicks:0,impressions:5,ctr:0,position:10},
  {keys:['https://feeeye.com/not-registered'],clicks:0,impressions:3,ctr:0,position:20}
];
const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(calls.length===1)return{ok:true,status:200,json:async()=>({access_token:'short-lived'})};
  return{ok:true,status:200,json:async()=>({rows})};
};
const result=await collectGscPageSignals({credentials,now:'2026-09-03T12:00:00.000Z',fetchImpl});assert.equal(calls.length,2);assert.equal(calls[0].url,'https://oauth2.googleapis.com/token');assert.doesNotMatch(calls[0].options.body,/short-lived/);const request=JSON.parse(calls[1].options.body);assert.deepEqual(request.dimensions,['page']);assert.equal(request.dataState,'final');assert.equal(request.rowLimit,25000);assert.equal(result.signals.coverage.gsc.status,'partial');assert.equal(result.signals.pages.length,2);assert.equal(result.summary.excluded_rows,2);assert.equal(result.summary.query_text_collected,false);assert.equal(result.signals.pages[0].average_position,4.2);assert.ok(buildPageOpportunityQueue(result.signals).candidates.length>=1);
const dataKey=Buffer.alloc(32,3),store=fs.mkdtempSync(path.join(os.tmpdir(),'feeeye-gsc-')),encryptedFile=path.join(store,'search','gsc','2026-08-31.json.enc');assert.equal(recordGscSignals(store,result.signals,dataKey).created,true);assert.equal(recordGscSignals(store,result.signals,dataKey).created,false);assert.deepEqual(readEncryptedJson(encryptedFile,dataKey),result.signals);assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(encryptedFile,'utf8'))).includes('impressions'),false);assert.throws(()=>recordGscSignals(store,{...result.signals,pages:[]},dataKey),/different immutable content/);
console.log('[OK] GSC bridge: readonly OAuth secrets, final 28-day page-only query, no query text, canonical allowlist, partial coverage disclosure, immutable ledger, and existing-page opportunity output.');
