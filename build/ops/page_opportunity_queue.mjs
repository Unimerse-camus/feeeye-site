#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildManifest } from './deployment_manifest.mjs';
import { readJson, validDay, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};
const noteCodes=['no_authorized_export','complete_aggregate_export','partial_aggregate_export'];
export function canonicalizeFeeEyeUrl(value) {
  const url=new URL(value);
  if(url.origin!=='https://feeeye.com'||url.username||url.password||url.search||url.hash)throw new Error('Only clean public FeeEye URLs are accepted');
  let pathname=url.pathname.replace(/\/index\.html$/,'/').replace(/\.html$/,'');
  if(!pathname.startsWith('/'))pathname='/'+pathname;
  return `https://feeeye.com${pathname}`;
}
const family=url=>{const path=new URL(url).pathname.replace(/^\/zh(?=\/)/,'');if(path.startsWith('/where-to-buy/'))return'where_to_buy';if(path.startsWith('/compare/'))return'compare';if(path.startsWith('/exchanges/'))return'exchange';if(path.startsWith('/learn/'))return'learn';if(path.startsWith('/research/'))return'research';if(path==='/'||path==='/zh/')return'home';return'other';};
export function validatePageSignals(data,{dist=path.join(root,'dist')}={}) {
  exact(data,['schema_version','window','coverage','pages'],'root');exact(data.window,['from','to'],'window');exact(data.coverage,['gsc'],'coverage');exact(data.coverage.gsc,['status','through','note_code'],'coverage.gsc');
  if(data.schema_version!==1||!validDay(data.window.from)||!validDay(data.window.to)||(Date.parse(data.window.to)-Date.parse(data.window.from))/86400000!==27||!['complete','partial','missing'].includes(data.coverage.gsc.status)||(data.coverage.gsc.through!==null&&!validDay(data.coverage.gsc.through))||!noteCodes.includes(data.coverage.gsc.note_code)||!Array.isArray(data.pages))throw new Error('Invalid page signal window or coverage');
  if(data.coverage.gsc.status==='missing'&&(data.coverage.gsc.through!==null||data.coverage.gsc.note_code!=='no_authorized_export'||data.pages.length)||data.coverage.gsc.status!=='missing'&&(!data.coverage.gsc.through||data.coverage.gsc.note_code==='no_authorized_export'))throw new Error('Coverage status conflicts with supplied page data');
  if(new Set(data.pages.map(row=>row.url)).size!==data.pages.length)throw new Error('Duplicate page rows are not allowed');
  const canonical=new Set(Object.keys(buildManifest(dist).urls));
  for(const row of data.pages) {
    exact(row,['url','clicks','impressions','average_position'],'page');
    const normalized=canonicalizeFeeEyeUrl(row.url);
    if(!canonical.has(normalized)||!Number.isSafeInteger(row.clicks)||row.clicks<0||!Number.isSafeInteger(row.impressions)||row.impressions<0||row.clicks>row.impressions||(row.average_position!==null&&(!Number.isFinite(row.average_position)||row.average_position<1||row.average_position>1000)))throw new Error('Invalid or unregistered page signal');
  }
  return data;
}
export function buildPageOpportunityQueue(data,{dist=path.join(root,'dist')}={}) {
  validatePageSignals(data,{dist});
  const grouped=new Map();
  for(const row of data.pages) {
    const canonical=canonicalizeFeeEyeUrl(row.url),current=grouped.get(canonical)||{canonical,family:family(canonical),clicks:0,impressions:0,position_weight:0,position_impressions:0,observed_variants:[]};
    current.clicks+=row.clicks;current.impressions+=row.impressions;current.observed_variants.push(row.url);
    if(row.average_position!==null&&row.impressions>0){current.position_weight+=row.average_position*row.impressions;current.position_impressions+=row.impressions;}
    grouped.set(canonical,current);
  }
  const pages=[...grouped.values()].map(x=>{const actions=[];if(new Set(x.observed_variants).size>1)actions.push('canonical_consolidation_check');if(x.impressions>=30&&x.clicks===0)actions.push('snippet_and_intent_review');if(x.impressions>=30&&x.position_impressions&&x.position_weight/x.position_impressions>20)actions.push('content_relevance_review');return{canonical:x.canonical,family:x.family,clicks:x.clicks,impressions:x.impressions,ctr:x.impressions?x.clicks/x.impressions:null,average_position:x.position_impressions?Number((x.position_weight/x.position_impressions).toFixed(1)):null,observed_variants:[...new Set(x.observed_variants)].sort(),actions};});
  const candidates=pages.filter(x=>x.actions.length).sort((a,b)=>b.impressions-a.impressions||b.observed_variants.length-a.observed_variants.length||a.canonical.localeCompare(b.canonical)).slice(0,10).map((x,index)=>({rank:index+1,...x}));
  return{schema_version:1,window:data.window,coverage:data.coverage,status:'draft',selection_required:true,automatic_page_creation:false,automatic_publication:false,input_rows:data.pages.length,canonical_pages:pages.length,candidates,recommendation:candidates.length?'Review one existing canonical page at a time; do not create query-variant pages automatically.':'No page has enough aggregate evidence for review.'};
}
export function pageOpportunityLogSummary(queue) {
  return{schema_version:queue.schema_version,window:queue.window,coverage:queue.coverage,status:queue.status,selection_required:queue.selection_required,automatic_page_creation:queue.automatic_page_creation,automatic_publication:queue.automatic_publication,input_rows:queue.input_rows,canonical_pages:queue.canonical_pages,candidate_count:queue.candidates.length,private_details_logged:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),input=args[args.indexOf('--input')+1];if(!input)throw new Error('Usage: --input FILE [--out FILE]');const queue=buildPageOpportunityQueue(readJson(input)),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],queue,path.join(root,'ops/automation/working'));console.log(JSON.stringify(pageOpportunityLogSummary(queue)));}
