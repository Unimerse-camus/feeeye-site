#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LEARNING_ARTICLES } from '../learning_content.mjs';
import { privateDataKey, readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';
import { validDay } from './ops_util.mjs';

const IDS=LEARNING_ARTICLES.map(item=>item.slug),LOCALES=['en','zh'],REASONS=['unclear','missing_step','outdated','broken_link','other'];
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};
const count=value=>Number.isSafeInteger(value)&&value>=0;
export function validateFeedbackAggregate(data) {
  exact(data,['schema_version','window','coverage','articles'],'feedback root');exact(data.window,['from','to'],'feedback window');exact(data.coverage,['zaraz'],'feedback coverage');exact(data.coverage.zaraz,['status','through','note_code'],'zaraz coverage');
  if(data.schema_version!==1||!validDay(data.window.from)||!validDay(data.window.to)||(Date.parse(data.window.to)-Date.parse(data.window.from))/86400000!==27||!['complete','partial','missing'].includes(data.coverage.zaraz.status)||(data.coverage.zaraz.through!==null&&!validDay(data.coverage.zaraz.through))||!['complete_aggregate_export','partial_aggregate_export','no_authorized_export'].includes(data.coverage.zaraz.note_code)||!Array.isArray(data.articles)||data.articles.length!==IDS.length*LOCALES.length)throw new Error('Invalid feedback aggregate window or coverage');
  const expected=new Set(IDS.flatMap(id=>LOCALES.map(locale=>id+'|'+locale))),seen=new Set();
  for(const row of data.articles){exact(row,['article_id','locale','article_end_views','helpful_yes','helpful_no','reasons'],'feedback article');exact(row.reasons,REASONS,'feedback reasons');const key=row.article_id+'|'+row.locale;if(!expected.has(key)||seen.has(key))throw new Error('Invalid or duplicate feedback article');seen.add(key);const values=[row.article_end_views,row.helpful_yes,row.helpful_no,...REASONS.map(reason=>row.reasons[reason])];if(values.some(value=>!count(value)))throw new Error('Invalid feedback count');if(row.helpful_yes+row.helpful_no>row.article_end_views||REASONS.reduce((n,reason)=>n+row.reasons[reason],0)!==row.helpful_no)throw new Error('Feedback totals conflict');}
  if(seen.size!==expected.size)throw new Error('Feedback inventory is incomplete');return data;
}
const actions=reasons=>[reasons.broken_link>=2?'verify_links':null,reasons.outdated>=2?'source_freshness_review':null,reasons.missing_step>0?'task_flow_gap_review':null,reasons.unclear>0?'clarity_review':null,reasons.other>0?'scope_review':null].filter(Boolean);
export function buildFeedbackImprovementQueue(data) {
  validateFeedbackAggregate(data);const candidates=[];
  for(const row of data.articles){const responses=row.helpful_yes+row.helpful_no,negative_rate=responses?row.helpful_no/responses:null,urgent=row.reasons.broken_link>=2||row.reasons.outdated>=2,qualified=urgent||(responses>=5&&row.helpful_no>=3&&negative_rate>=.4);if(!qualified)continue;candidates.push({article_id:row.article_id,locale:row.locale,responses,negative_responses:row.helpful_no,negative_rate:Number(negative_rate.toFixed(4)),reasons:row.reasons,priority:urgent?'urgent_review':'evidence_review',actions:actions(row.reasons),counterpart_locale_required:true});}
  candidates.sort((a,b)=>(a.priority===b.priority?0:a.priority==='urgent_review'?-1:1)||b.negative_responses-a.negative_responses||b.responses-a.responses||a.article_id.localeCompare(b.article_id)||a.locale.localeCompare(b.locale));
  return{schema_version:1,window:data.window,coverage:data.coverage,status:candidates.length?'improvement_candidates_ready':'observe',decision:candidates.length?'prepare_bilingual_revision_evidence':'hold',candidate_count:candidates.length,candidates:candidates.slice(0,5),thresholds:{minimum_responses:5,minimum_negative_responses:3,minimum_negative_rate:.4,urgent_broken_link_count:2,urgent_outdated_count:2},guardrails:{structured_categories_only:true,free_text_accepted:false,user_feedback_is_evidence_not_fact:true,source_verification_required:true,bilingual_semantic_review_required:true,active_experiment_conflict_check_required:true,automatic_content_change_allowed:false,automatic_publication_allowed:false}};
}
export function feedbackQueueSummary(queue){return{schema_version:queue.schema_version,window:queue.window,coverage:queue.coverage,status:queue.status,decision:queue.decision,candidate_count:queue.candidate_count,automatic_content_change_allowed:false,automatic_publication_allowed:false,private_metrics_logged:false};}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;},input=value('--input-encrypted'),out=value('--out-encrypted');if(!input||!out)throw new Error('Usage: --input-encrypted FILE --out-encrypted FILE');const key=privateDataKey(),queue=buildFeedbackImprovementQueue(readEncryptedJson(input,key));writeEncryptedJson(out,queue,key);console.log(JSON.stringify(feedbackQueueSummary(queue)));}
