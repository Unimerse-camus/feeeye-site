#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPageOpportunityQueue, validatePageSignals } from './page_opportunity_queue.mjs';
import { privateDataKey, readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';
import { validDay } from './ops_util.mjs';

const DAY=86_400_000,SOURCES=['direct','search','ai','social','self','other'];
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};
const latest=(root,parts,pattern)=>{const dir=path.join(path.resolve(root),...parts);if(!fs.existsSync(dir))return null;const files=fs.readdirSync(dir).filter(name=>pattern.test(name)).sort();return files.length?path.join(dir,files.at(-1)):null;};

export function validateCloudflareSnapshot(data) {
  exact(data,['schema_version','window','coverage','scope','daily','totals'],'cloudflare root');exact(data.window,['from','to'],'cloudflare window');exact(data.coverage,['cloudflare'],'cloudflare coverage');
  if(data.schema_version!==1||!validDay(data.window.from)||!validDay(data.window.to)||(Date.parse(data.window.to)-Date.parse(data.window.from))/DAY!==27||!Array.isArray(data.daily)||data.daily.length!==28||data.scope?.hostname!=='feeeye.com'||data.scope.raw_referrers_retained!==false||data.scope.personal_data_collected!==false)throw new Error('Invalid Cloudflare snapshot');
  for(const row of data.daily){exact(row,['date','page_views','visits','sources','performance','web_vitals'],'cloudflare day');if(!validDay(row.date)||row.date<data.window.from||row.date>data.window.to||!Number.isSafeInteger(row.page_views)||!Number.isSafeInteger(row.visits)||row.page_views<0||row.visits<0||row.visits>row.page_views)throw new Error('Invalid Cloudflare daily aggregate');exact(row.sources,SOURCES,'cloudflare sources');for(const value of Object.values(row.sources))if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid Cloudflare source aggregate');}
  return data;
}

export function loadCrossChannelSources(storeRoot,key) {
  const cloudflareFile=latest(storeRoot,['analytics','cloudflare'],/^\d{4}-\d{2}-\d{2}\.json\.enc$/),gscFile=latest(storeRoot,['search','gsc'],/^\d{4}-\d{2}-\d{2}\.json\.enc$/);if(!cloudflareFile||!gscFile)throw new Error('Cross-channel encrypted sources are incomplete');
  return{cloudflare:validateCloudflareSnapshot(readEncryptedJson(cloudflareFile,key)),gsc:readEncryptedJson(gscFile,key)};
}

export function analyzeCrossChannel({cloudflare,gsc,dist}={}) {
  validateCloudflareSnapshot(cloudflare);validatePageSignals(gsc,{dist});const queue=buildPageOpportunityQueue(gsc,{dist}),weeklyTo=cloudflare.window.to,weeklyFrom=new Date(Date.parse(weeklyTo+'T00:00:00Z')-6*DAY).toISOString().slice(0,10),days=cloudflare.daily.filter(row=>row.date>=weeklyFrom&&row.date<=weeklyTo);
  const siteVisits=days.reduce((n,row)=>n+row.visits,0),pageViews=days.reduce((n,row)=>n+row.page_views,0),sources=Object.fromEntries(SOURCES.map(key=>[key,days.reduce((n,row)=>n+row.sources[key],0)])),gscClicks=gsc.pages.reduce((n,row)=>n+row.clicks,0),gscImpressions=gsc.pages.reduce((n,row)=>n+row.impressions,0);
  let decision='observe',reason='no_existing_page_candidate';if(siteVisits<30){decision='hold';reason='insufficient_7d_site_sample';}else if(queue.candidates.length){decision='prepare_existing_page_experiment';reason='page_opportunity_with_site_baseline';}
  return{schema_version:1,generated_at:new Date().toISOString(),status:'analyzed',source_windows:{cloudflare:{from:weeklyFrom,to:weeklyTo,basis:'completed_7d',coverage:cloudflare.coverage.cloudflare},gsc:{from:gsc.window.from,to:gsc.window.to,basis:'final_28d_page_aggregate',coverage:gsc.coverage.gsc}},metrics:{site_visits_7d:siteVisits,page_views_7d:pageViews,source_visits_7d:sources,search_clicks_28d:gscClicks,search_impressions_28d:gscImpressions},page_opportunities:{candidate_count:queue.candidates.length,candidates:queue.candidates.slice(0,5)},attribution:{content_level:'unavailable',reason:'aggregate_sources_do_not_establish_content_attribution'},decision,reason,automatic_publication_allowed:false,automatic_cadence_increase_allowed:false};
}

export function recordCrossChannelAnalysis(storeRoot,report,key) {const cf=report?.source_windows?.cloudflare?.to,gsc=report?.source_windows?.gsc?.to;if(!validDay(cf)||!validDay(gsc))throw new Error('Invalid cross-channel source windows');return writeEncryptedJson(path.join(path.resolve(storeRoot),'cross-channel',`${cf}__${gsc}.json.enc`),report,key);}
export function crossChannelSummary(report) {return{schema_version:report.schema_version,status:report.status,source_windows:report.source_windows,decision:report.decision,reason:report.reason,candidate_count:report.page_opportunities.candidate_count,content_attribution:report.attribution.content_level,automatic_publication_allowed:false,private_metrics_logged:false};}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;},store=value('--store'),ledger=value('--ledger-store'),out=value('--out');if(!store||!ledger||!out)throw new Error('Usage: --store DIR --ledger-store DIR --out FILE');const key=privateDataKey(),report=analyzeCrossChannel({...loadCrossChannelSources(store,key)}),ledgerRecord=recordCrossChannelAnalysis(ledger,report,key),target=path.resolve(out);if(!target.startsWith(path.resolve('ops/automation/working')+path.sep)||!target.endsWith('.json.enc'))throw new Error('Cross-channel output must be encrypted inside working');writeEncryptedJson(target,report,key);console.log(JSON.stringify({...crossChannelSummary(report),ledger_record_created:ledgerRecord.created}));}
