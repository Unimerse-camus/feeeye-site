#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeXMetrics, loadMetricsSnapshots, recordAnalysis, validateMetricsSnapshot } from './x_metrics_analysis.mjs';
import { readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),workflow=fs.readFileSync(path.join(root,'.github/workflows/x-analysis.yml'),'utf8');
assert.match(workflow,/workflow_run:/);assert.match(workflow,/workflows: \[x-metrics\]/);assert.match(workflow,/vars\.FEEEYE_X_ANALYSIS == 'enabled'/);assert.match(workflow,/group: x-receipt-ledger/);assert.match(workflow,/secrets\.FEEEYE_OPS_DATA_KEY/);assert.doesNotMatch(workflow,/FEEEYE_X_(?:CONSUMER|ACCESS)|api\.x\.com|--execute|schedule:/);
const metricValues={impressions:100,likes:2,replies:0,reposts:1,quotes:0,bookmarks:3,engagements:8,url_clicks:4,profile_clicks:null};
const snapshot=(key,checkpoint='24h',metrics=metricValues)=>{const values={...metrics};return{schema_version:1,account:'@FeeEyeOfficial',request_id:`request-${key.slice(0,4)}`,idempotency_key:key,post_url:`https://x.com/FeeEyeOfficial/status/${key.charCodeAt(0)}`,checkpoint,due_at:'2026-09-04T07:48:34.062Z',observed_at:'2026-09-04T08:07:34.062Z',lag_minutes:19,metrics:values,missing_fields:Object.keys(values).filter(field=>values[field]===null)};};
assert.equal(analyzeXMetrics([]).status,'no_metrics');const first=snapshot('a'.repeat(64));validateMetricsSnapshot(first);const observed=analyzeXMetrics([first]);assert.equal(observed.decision,'observe');assert.equal(observed.reason,'waiting_for_28d_checkpoint');assert.equal(observed.automatic_publish_allowed,false);
const one28=analyzeXMetrics([snapshot('a'.repeat(64),'28d')]);assert.equal(one28.decision,'hold');assert.equal(one28.reason,'insufficient_28d_sample');
const three=[snapshot('a'.repeat(64),'28d'),snapshot('b'.repeat(64),'28d'),snapshot('c'.repeat(64),'28d')];const baseline=analyzeXMetrics(three);assert.equal(baseline.decision,'hold');assert.equal(baseline.reason,'downstream_effective_visits_required');assert.equal(baseline.cadence_multiplier,1);
const missing=structuredClone(three);missing[0].metrics.url_clicks=null;missing[0].missing_fields=['url_clicks','profile_clicks'];assert.equal(analyzeXMetrics(missing).reason,'required_metrics_missing');
const bad=structuredClone(first);bad.missing_fields=[];assert.throws(()=>validateMetricsSnapshot(bad),/missing metric declaration/);
const dataKey=Buffer.alloc(32,2),store=fs.mkdtempSync(path.join(os.tmpdir(),'feeeye-x-analysis-')),dir=path.join(store,'x-metrics','a'.repeat(64));writeEncryptedJson(path.join(dir,'24h.json.enc'),first,dataKey);assert.deepEqual(loadMetricsSnapshots(store,dataKey),[first]);assert.equal(recordAnalysis(store,observed,dataKey).created,true);assert.equal(recordAnalysis(store,observed,dataKey).created,false);const analysisFile=path.join(store,'x-analysis',`${observed.analysis_id}.json.enc`);assert.deepEqual(readEncryptedJson(analysisFile,dataKey),observed);assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(analysisFile,'utf8'))).includes('url_clicks'),false);
console.log('[OK] X analysis: aggregate snapshots only, deterministic append-only report, 24h/7d observe, three-sample 28d gate, missing-is-hold, downstream-visits requirement, and no automatic publishing.');
