#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLOUDFLARE_GRAPHQL, FEEEYE_CLOUDFLARE_ACCOUNT_ID, FEEEYE_CLOUDFLARE_SITE_TAG, cloudflareProbeCredentials } from './cloudflare_analytics_probe.mjs';
import { privateDataKey, writeEncryptedJson } from './private_data_crypto.mjs';
import { validDay, writeNewJson } from './ops_util.mjs';

const DAY=86_400_000,CATEGORIES=['direct','search','ai','social','self','other'];
const SEARCH_HOSTS=['bing.com','duckduckgo.com','search.brave.com','search.yahoo.com','yandex.com','baidu.com','ecosia.org'];
const AI_HOSTS=['chatgpt.com','chat.openai.com','openai.com','perplexity.ai','claude.ai','gemini.google.com','copilot.microsoft.com'];
const SOCIAL_HOSTS=['x.com','twitter.com','reddit.com','youtube.com','youtu.be','t.me','telegram.org','discord.com'];
const cleanHost=value=>String(value||'').trim().toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
const matches=(host,list)=>list.some(item=>host===item||host.endsWith('.'+item));

export function classifyReferrer(value) {
  const host=cleanHost(value);if(!host)return'direct';if(host==='feeeye.com'||host.endsWith('.feeeye.com'))return'self';if(matches(host,AI_HOSTS))return'ai';if(matches(host,SOCIAL_HOSTS))return'social';if(matches(host,SEARCH_HOSTS)||/(^|\.)google\.[a-z.]+$/.test(host))return'search';return'other';
}

export function cloudflareAnalyticsWindow(now=new Date().toISOString()) {
  const instant=Date.parse(now);if(!Number.isFinite(instant))throw new Error('Invalid Cloudflare analytics collection time');
  const current=new Date(instant),today=Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),current.getUTCDate()),end=today-DAY;
  return{from:new Date(end-27*DAY).toISOString().slice(0,10),to:new Date(end).toISOString().slice(0,10)};
}

const query=`query FeeEyeRUM($accountTag: string!, $pageloadFilter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject, $performanceFilter: AccountRumPerformanceEventsAdaptiveGroupsFilter_InputObject, $vitalsFilter: AccountRumWebVitalsEventsAdaptiveGroupsFilter_InputObject) {
  viewer { accounts(filter: { accountTag: $accountTag }) {
    pageload: rumPageloadEventsAdaptiveGroups(limit: 5000, filter: $pageloadFilter) { count dimensions { date refererHost } sum { visits } }
    performance: rumPerformanceEventsAdaptiveGroups(limit: 100, filter: $performanceFilter) { dimensions { date } quantiles { firstContentfulPaintP75 pageLoadTimeP75 } }
    vitals: rumWebVitalsEventsAdaptiveGroups(limit: 100, filter: $vitalsFilter) { dimensions { date } quantiles { cumulativeLayoutShiftP75 interactionToNextPaintP75 largestContentfulPaintP75 timeToFirstByteP75 } }
  } }
}`;

const integer=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const number=value=>Number.isFinite(value)&&value>=0?value:null;
const emptyDay=date=>({date,page_views:0,visits:0,sources:Object.fromEntries(CATEGORIES.map(key=>[key,0])),performance:{first_contentful_paint_p75_ms:null,page_load_time_p75_ms:null},web_vitals:{cls_p75:null,inp_p75_ms:null,lcp_p75_ms:null,ttfb_p75_ms:null}});
const within=(date,window)=>validDay(date)&&date>=window.from&&date<=window.to;

export async function collectCloudflareAnalytics({token,now=new Date().toISOString(),fetchImpl=fetch}={}) {
  if(!token)throw new Error('Cloudflare analytics token is required');const window=cloudflareAnalyticsWindow(now),filter={date_geq:window.from,date_leq:window.to,siteTag:FEEEYE_CLOUDFLARE_SITE_TAG,requestHost:'feeeye.com',bot:0};
  const response=await fetchImpl(CLOUDFLARE_GRAPHQL,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','User-Agent':'FeeEye-Cloudflare-Analytics/1.0'},body:JSON.stringify({query,variables:{accountTag:FEEEYE_CLOUDFLARE_ACCOUNT_ID,pageloadFilter:filter,performanceFilter:filter,vitalsFilter:filter}}),signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw new Error(`Cloudflare analytics query failed (HTTP ${response.status})`);const json=await response.json();if(json.errors?.length)throw new Error('Cloudflare analytics query returned errors');const account=json.data?.viewer?.accounts?.[0];if(!account)throw new Error('Cloudflare analytics account response is unavailable');
  const days=new Map();for(let at=Date.parse(window.from+'T00:00:00Z');at<=Date.parse(window.to+'T00:00:00Z');at+=DAY){const date=new Date(at).toISOString().slice(0,10);days.set(date,emptyDay(date));}
  for(const row of account.pageload||[]){const date=row?.dimensions?.date;if(!within(date,window))throw new Error('Cloudflare pageload row is outside the fixed window');const views=integer(row.count),visits=integer(row?.sum?.visits);if(views===null||visits===null||visits>views)throw new Error('Invalid Cloudflare pageload aggregate');const day=days.get(date),category=classifyReferrer(row?.dimensions?.refererHost);day.page_views+=views;day.visits+=visits;day.sources[category]+=visits;}
  for(const row of account.performance||[]){const date=row?.dimensions?.date;if(!within(date,window))throw new Error('Cloudflare performance row is outside the fixed window');const day=days.get(date),q=row.quantiles||{};day.performance.first_contentful_paint_p75_ms=number(q.firstContentfulPaintP75);day.performance.page_load_time_p75_ms=number(q.pageLoadTimeP75);}
  for(const row of account.vitals||[]){const date=row?.dimensions?.date;if(!within(date,window))throw new Error('Cloudflare vitals row is outside the fixed window');const day=days.get(date),q=row.quantiles||{};day.web_vitals.cls_p75=number(q.cumulativeLayoutShiftP75);day.web_vitals.inp_p75_ms=number(q.interactionToNextPaintP75);day.web_vitals.lcp_p75_ms=number(q.largestContentfulPaintP75);day.web_vitals.ttfb_p75_ms=number(q.timeToFirstByteP75);}
  const daily=[...days.values()],totals={page_views:daily.reduce((n,x)=>n+x.page_views,0),visits:daily.reduce((n,x)=>n+x.visits,0),sources:Object.fromEntries(CATEGORIES.map(key=>[key,daily.reduce((n,x)=>n+x.sources[key],0)]))};
  return{schema_version:1,window,coverage:{cloudflare:{status:'partial',through:window.to,note_code:'eu_excluded_web_analytics'}},scope:{hostname:'feeeye.com',site_tag_bound:true,eu_visitors_excluded:true,raw_referrers_retained:false,personal_data_collected:false},daily,totals};
}

export function recordCloudflareAnalytics(storeRoot,result,key) {if(!validDay(result?.window?.to))throw new Error('Invalid Cloudflare analytics window');return writeEncryptedJson(path.join(path.resolve(storeRoot),'analytics','cloudflare',`${result.window.to}.json.enc`),result,key);}
export function cloudflareAnalyticsSummary(result) {return{schema_version:result.schema_version,window:result.window,coverage:result.coverage,days:result.daily.length,source_categories:CATEGORIES,encrypted:true,raw_referrers_retained:false,private_metrics_logged:false};}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;},store=value('--ledger-store'),summaryOut=value('--summary-out');if(!store||!summaryOut)throw new Error('Usage: --ledger-store DIR --summary-out FILE');const {token}=cloudflareProbeCredentials(),result=await collectCloudflareAnalytics({token}),record=recordCloudflareAnalytics(store,result,privateDataKey());writeNewJson(summaryOut,{...cloudflareAnalyticsSummary(result),record_created:record.created},path.resolve('ops/automation/working'));console.log(JSON.stringify(cloudflareAnalyticsSummary(result)));}
