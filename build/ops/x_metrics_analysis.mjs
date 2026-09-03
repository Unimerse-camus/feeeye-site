#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sha256, stable, validInstant } from './ops_util.mjs';
import { privateDataKey, readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const CHECKPOINTS=['24h','7d','28d'];
const METRICS=['impressions','likes','replies','reposts','quotes','bookmarks','engagements','url_clicks','profile_clicks'];
const SNAPSHOT_FIELDS=['schema_version','account','request_id','idempotency_key','post_url','checkpoint','due_at','observed_at','lag_minutes','metrics','missing_fields'];
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error(`Unexpected fields: ${label}`);};

export function validateMetricsSnapshot(snapshot) {
  exact(snapshot,SNAPSHOT_FIELDS,'X metrics snapshot');exact(snapshot.metrics,METRICS,'X metrics');
  if(snapshot.schema_version!==1||snapshot.account!=='@FeeEyeOfficial'||!/^https:\/\/x\.com\/FeeEyeOfficial\/status\/[0-9]+$/.test(snapshot.post_url||'')||!/^[a-f0-9]{64}$/.test(snapshot.idempotency_key||'')||!CHECKPOINTS.includes(snapshot.checkpoint)||!validInstant(snapshot.due_at)||!validInstant(snapshot.observed_at)||!Number.isInteger(snapshot.lag_minutes)||snapshot.lag_minutes<0||!Array.isArray(snapshot.missing_fields))throw new Error('Invalid X metrics snapshot');
  for(const field of METRICS)if(snapshot.metrics[field]!==null&&(!Number.isSafeInteger(snapshot.metrics[field])||snapshot.metrics[field]<0))throw new Error('Invalid X aggregate metric');
  const missing=METRICS.filter(field=>snapshot.metrics[field]===null);if(JSON.stringify(snapshot.missing_fields)!==JSON.stringify(missing))throw new Error('X missing metric declaration mismatch');
  return snapshot;
}

export function loadMetricsSnapshots(storeRoot,dataKey) {
  const dir=path.join(path.resolve(storeRoot),'x-metrics');if(!fs.existsSync(dir))return[];const snapshots=[];
  for(const directoryKey of fs.readdirSync(dir).sort()){
    if(!/^[a-f0-9]{64}$/.test(directoryKey))throw new Error('Unexpected X metrics ledger directory');
    const keyDir=path.join(dir,directoryKey);
    for(const file of fs.readdirSync(keyDir).sort()){
      if(!/^(24h|7d|28d)\.json\.enc$/.test(file))throw new Error('Unexpected X metrics ledger file');
      const snapshot=validateMetricsSnapshot(readEncryptedJson(path.join(keyDir,file),dataKey));if(snapshot.idempotency_key!==directoryKey||`${snapshot.checkpoint}.json.enc`!==file)throw new Error('X metrics ledger path mismatch');snapshots.push(snapshot);
    }
  }
  return snapshots;
}

export function analyzeXMetrics(snapshots) {
  const valid=snapshots.map(validateMetricsSnapshot).sort((a,b)=>a.post_url.localeCompare(b.post_url)||CHECKPOINTS.indexOf(a.checkpoint)-CHECKPOINTS.indexOf(b.checkpoint));
  if(!valid.length)return{schema_version:1,status:'no_metrics',analysis_id:null,decision:'observe',reason:'no_metric_snapshots',cadence_multiplier:1,automatic_publish_allowed:false,snapshot_count:0,post_count:0,completed_28d_samples:0,facts:[]};
  const groups=new Map();for(const item of valid){if(!groups.has(item.idempotency_key))groups.set(item.idempotency_key,[]);groups.get(item.idempotency_key).push(item);}
  const facts=[...groups.values()].map(items=>{const latest=items.at(-1);return{post_url:latest.post_url,request_id:latest.request_id,latest_checkpoint:latest.checkpoint,observed_at:latest.observed_at,metrics:latest.metrics,missing_fields:latest.missing_fields};}).sort((a,b)=>a.post_url.localeCompare(b.post_url));
  const completed=valid.filter(item=>item.checkpoint==='28d');let decision='observe',reason='waiting_for_28d_checkpoint';
  if(completed.length>0&&completed.length<3){decision='hold';reason='insufficient_28d_sample';}
  else if(completed.length>=3&&completed.some(item=>item.metrics.impressions===null||item.metrics.url_clicks===null)){decision='hold';reason='required_metrics_missing';}
  else if(completed.length>=3){decision='hold';reason='downstream_effective_visits_required';}
  const input={snapshots:valid};
  return{schema_version:1,status:'analyzed',analysis_id:sha256(stable(input)),decision,reason,cadence_multiplier:1,automatic_publish_allowed:false,snapshot_count:valid.length,post_count:groups.size,completed_28d_samples:completed.length,facts};
}

export function recordAnalysis(storeRoot,report,key) {
  if(report.status==='no_metrics')return{created:false,file:null};
  const file=path.join(path.resolve(storeRoot),'x-analysis',`${report.analysis_id}.json.enc`);return writeEncryptedJson(file,report,key);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),value=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:null;},store=value('--store'),out=value('--out'),ledgerStore=value('--ledger-store');
  if(!store||!out)throw new Error('Usage: --store DIR --out FILE [--ledger-store DIR]');
  const key=privateDataKey(),report=analyzeXMetrics(loadMetricsSnapshots(store,key));if(ledgerStore)recordAnalysis(ledgerStore,report,key);const target=path.resolve(out),working=path.resolve(root,'ops/automation/working')+path.sep;if(!target.startsWith(working)||!target.endsWith('.json.enc'))throw new Error('Encrypted analysis output must be inside ops/automation/working');writeEncryptedJson(target,report,key);console.log(JSON.stringify({status:report.status,analysis_id:report.analysis_id,decision:report.decision,reason:report.reason,snapshot_count:report.snapshot_count,automatic_publish_allowed:false}));
}
