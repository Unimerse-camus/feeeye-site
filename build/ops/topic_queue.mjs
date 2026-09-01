#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEARNING_ARTICLES } from '../learning_content.mjs';
import { readJson, validDay, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const ids=LEARNING_ARTICLES.map(x=>x.slug);
const metricKeys=['search_impressions','search_clicks','ai_citations','community_questions'];
const noteCodes=['no_authorized_export','complete_aggregate_export','partial_aggregate_export','manual_aggregate_only'];
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};
export function validateEditorialSignals(data) {
  exact(data,['schema_version','window','coverage','topics'],'root');exact(data.window,['from','to'],'window');exact(data.coverage,['gsc','bing_ai','community'],'coverage');
  if(data.schema_version!==1||!validDay(data.window.from)||!validDay(data.window.to)||(Date.parse(data.window.to)-Date.parse(data.window.from))/86400000!==27)throw new Error('Editorial signals require one exact 28-day window');
  for(const source of ['gsc','bing_ai','community']) {
    const value=data.coverage?.[source];exact(value,['status','through','note_code'],'coverage.'+source);
    if(!['complete','partial','missing'].includes(value.status)||(value.through!==null&&!validDay(value.through))||!noteCodes.includes(value.note_code))throw new Error('Invalid coverage: '+source);
  }
  if(!Array.isArray(data.topics)||data.topics.length!==ids.length||new Set(data.topics.map(x=>x.id)).size!==ids.length||ids.some(id=>!data.topics.some(x=>x.id===id)))throw new Error('Topic inventory must cover every registered learning topic once');
  for(const row of data.topics) {
    exact(row,['id','evidence_status','search_impressions','search_clicks','ai_citations','community_questions','materially_updated_at'],'topic.'+row.id);
    if(!ids.includes(row.id)||!['current','stale','blocked'].includes(row.evidence_status)||(row.materially_updated_at!==null&&!validDay(row.materially_updated_at)))throw new Error('Invalid topic identity or evidence state');
    for(const key of metricKeys)if(row[key]!==null&&(!Number.isSafeInteger(row[key])||row[key]<0))throw new Error('Invalid aggregate metric: '+row.id+'.'+key);
  }
  // Exact schemas deliberately reject raw queries, usernames, post bodies, addresses and user identifiers.
  return data;
}
const number=value=>value===null?-1:value;
export function buildTopicQueue(data) {
  validateEditorialSignals(data);
  const holds=data.topics.filter(x=>x.evidence_status!=='current').map(x=>({id:x.id,status:'hold',reason:`evidence_${x.evidence_status}`}));
  const candidates=data.topics.filter(x=>x.evidence_status==='current'&&metricKeys.some(k=>number(x[k])>0)).sort((a,b)=>
    number(b.community_questions)-number(a.community_questions)||number(b.search_impressions)-number(a.search_impressions)||number(b.search_clicks)-number(a.search_clicks)||number(b.ai_citations)-number(a.ai_citations)||a.id.localeCompare(b.id)
  ).slice(0,5).map((x,index)=>({rank:index+1,id:x.id,status:'candidate',signals:Object.fromEntries(metricKeys.map(k=>[k,x[k]])),reasons:[x.community_questions>0?'categorized community questions':null,x.search_impressions>0?'search demand':null,x.search_clicks>0?'existing search clicks':null,x.ai_citations>0?'AI citation activity':null].filter(Boolean)}));
  return {schema_version:1,window:data.window,status:'draft',selection_required:true,automatic_publication:false,candidates,holds,recommendation:candidates.length?'Select exactly one candidate after reviewing evidence scope and human capacity.':'No candidate selected: aggregate demand signals are missing or zero.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2),input=args[args.indexOf('--input')+1];if(!input)throw new Error('Usage: --input FILE [--out FILE]');
  const queue=buildTopicQueue(readJson(input)),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],queue,path.join(root,'ops/automation/working'));
  console.log(JSON.stringify(queue,null,2));
}
