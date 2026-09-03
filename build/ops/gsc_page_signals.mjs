#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildManifest } from './deployment_manifest.mjs';
import { canonicalizeFeeEyeUrl, validatePageSignals } from './page_opportunity_queue.mjs';
import { validDay, writeNewJson } from './ops_util.mjs';
import { privateDataKey, writeEncryptedJson } from './private_data_crypto.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const DAY=86_400_000;
const SITE='https://feeeye.com/';
const ALLOWED_PROPERTIES=new Set([SITE,'sc-domain:feeeye.com']);

export function gscWindow(now=new Date().toISOString()) {
  const parsed=Date.parse(now);if(!Number.isFinite(parsed))throw new Error('Invalid GSC collection time');
  const today=new Date(parsed).toISOString().slice(0,10),to=new Date(Date.parse(today)-3*DAY).toISOString().slice(0,10),from=new Date(Date.parse(to)-27*DAY).toISOString().slice(0,10);
  return{from,to};
}

export function gscCredentials(env=process.env) {
  const names=['FEEEYE_GSC_CLIENT_ID','FEEEYE_GSC_CLIENT_SECRET','FEEEYE_GSC_REFRESH_TOKEN'],missing=names.filter(name=>!env[name]);if(missing.length)throw new Error(`Missing GSC secrets: ${missing.join(', ')}`);
  return{clientId:env.FEEEYE_GSC_CLIENT_ID,clientSecret:env.FEEEYE_GSC_CLIENT_SECRET,refreshToken:env.FEEEYE_GSC_REFRESH_TOKEN};
}

export function gscProperty(env=process.env) {const value=env.FEEEYE_GSC_SITE_URL||SITE;if(!ALLOWED_PROPERTIES.has(value))throw new Error('GSC property must be the exact FeeEye URL-prefix or domain property');return value;}

async function accessToken(credentials,fetchImpl) {
  const body=new URLSearchParams({client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:credentials.refreshToken,grant_type:'refresh_token'});
  const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(15_000)});if(!response.ok)throw new Error(`GSC OAuth refresh failed (HTTP ${response.status})`);
  const token=(await response.json())?.access_token;if(!token)throw new Error('GSC OAuth response omitted access token');return token;
}

export async function collectGscPageSignals({credentials,siteUrl=SITE,now=new Date().toISOString(),fetchImpl=fetch,dist=path.join(root,'dist')}) {
  if(!ALLOWED_PROPERTIES.has(siteUrl))throw new Error('Invalid GSC FeeEye property');
  const window=gscWindow(now),token=await accessToken(credentials,fetchImpl),endpoint=`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,request={startDate:window.from,endDate:window.to,dimensions:['page'],rowLimit:25000,startRow:0,dataState:'final',aggregationType:'byPage'};
  const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(30_000)});if(!response.ok)throw new Error(`GSC page analytics failed (HTTP ${response.status})`);
  const payload=await response.json(),rows=Array.isArray(payload.rows)?payload.rows:[],canonical=new Set(Object.keys(buildManifest(dist).urls)),pages=[],excluded=[];
  for(const row of rows){
    try{
      if(!Array.isArray(row.keys)||row.keys.length!==1||typeof row.keys[0]!=='string')throw new Error('not_page_only');
      const url=canonicalizeFeeEyeUrl(row.keys[0]);if(!canonical.has(url))throw new Error('not_registered');
      const clicks=Number(row.clicks),impressions=Number(row.impressions),position=Number(row.position);if(!Number.isSafeInteger(clicks)||!Number.isSafeInteger(impressions)||clicks<0||impressions<0||clicks>impressions||!Number.isFinite(position)||position<1||position>1000)throw new Error('invalid_metrics');
      pages.push({url:row.keys[0],clicks,impressions,average_position:Number(position.toFixed(1))});
    }catch(error){excluded.push(error.message||'invalid_row');}
  }
  pages.sort((a,b)=>b.impressions-a.impressions||a.url.localeCompare(b.url));
  const partial=excluded.length>0||rows.length===25000,signals={schema_version:1,window,coverage:{gsc:{status:partial?'partial':'complete',through:window.to,note_code:partial?'partial_aggregate_export':'complete_aggregate_export'}},pages};validatePageSignals(signals,{dist});
  return{signals,summary:{window,property_type:siteUrl.startsWith('sc-domain:')?'domain':'url_prefix',input_rows:rows.length,accepted_rows:pages.length,excluded_rows:excluded.length,row_limit_reached:rows.length===25000,dimensions:['page'],data_state:'final',query_text_collected:false}};
}

export function recordGscSignals(storeRoot,signals,key) {
  if(!validDay(signals?.window?.to))throw new Error('Invalid GSC signal window');const file=path.join(path.resolve(storeRoot),'search','gsc',`${signals.window.to}.json.enc`);return writeEncryptedJson(file,signals,key);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),value=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:null;},out=value('--out'),summaryOut=value('--summary-out'),ledger=value('--ledger-store');if(!out||!summaryOut)throw new Error('Usage: --out FILE --summary-out FILE [--ledger-store DIR]');
  const key=privateDataKey(),result=await collectGscPageSignals({credentials:gscCredentials(),siteUrl:gscProperty()});if(ledger)recordGscSignals(ledger,result.signals,key);writeNewJson(out,result.signals,path.join(root,'ops/automation/working'));writeNewJson(summaryOut,result.summary,path.join(root,'ops/automation/working'));console.log(JSON.stringify(result.summary));
}
