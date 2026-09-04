#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalizeFeeEyeUrl, validatePageSignals } from './page_opportunity_queue.mjs';
import { privateDataKey, readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';
import { readJson, validDay } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const DAY=86_400_000;
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};
const latest=(storeRoot)=>{const dir=path.join(path.resolve(storeRoot),'search','gsc');if(!fs.existsSync(dir))return null;const files=fs.readdirSync(dir).filter(name=>/^\d{4}-\d{2}-\d{2}\.json\.enc$/.test(name)).sort();return files.length?path.join(dir,files.at(-1)):null;};

export function validateExperiment(experiment) {
  exact(experiment,['schema_version','id','status','canonical','locale','baseline','change_scope','before','after','hypothesis','guardrails','approval_required','deployment'],'experiment');
  exact(experiment.deployment,['verified','verified_at','source_revision','build_id','review_not_before'],'deployment');
  if(experiment.schema_version!==2||experiment.status!=='observing'||experiment.locale!=='zh'||experiment.canonical!=='https://feeeye.com/zh/'||experiment.approval_required!==false||experiment.deployment.verified!==true||!Number.isFinite(Date.parse(experiment.deployment.verified_at))||!/^[a-f0-9]{40}$/.test(experiment.deployment.source_revision||'')||!/^[a-f0-9]{64}$/.test(experiment.deployment.build_id||'')||!validDay(experiment.deployment.review_not_before))throw new Error('Invalid active SEO experiment');
  if(experiment.guardrails?.observation_days_after_deployment!==28||experiment.guardrails.minimum_impressions_before_review!==30||experiment.guardrails.no_interim_copy_changes!==true||experiment.guardrails.no_overlapping_page_experiment!==true||experiment.guardrails.automatic_mutation!==false||experiment.guardrails.automatic_publication!==false||experiment.guardrails.raw_queries_stored!==false)throw new Error('Unsafe SEO experiment guardrails');
  const deployedDay=experiment.deployment.verified_at.slice(0,10),expected=new Date(Date.parse(deployedDay+'T00:00:00Z')+28*DAY).toISOString().slice(0,10);if(experiment.deployment.review_not_before!==expected)throw new Error('Experiment review date does not match the 28-day freeze');
  return experiment;
}

export function loadLatestGsc(storeRoot,key) {const file=latest(storeRoot);if(!file)throw new Error('Encrypted GSC source is missing');return readEncryptedJson(file,key);}

export function observeExperiment({experiment,gsc,dist}={}) {
  validateExperiment(experiment);validatePageSignals(gsc,{dist});
  const grouped={clicks:0,impressions:0,position_weight:0,position_impressions:0};
  let found=false;for(const row of gsc.pages){if(canonicalizeFeeEyeUrl(row.url)!==experiment.canonical)continue;found=true;grouped.clicks+=row.clicks;grouped.impressions+=row.impressions;if(row.average_position!==null&&row.impressions>0){grouped.position_weight+=row.average_position*row.impressions;grouped.position_impressions+=row.impressions;}}
  const completePostdeployWindow=gsc.window.from>=experiment.deployment.verified_at.slice(0,10)&&gsc.window.to>=experiment.deployment.review_not_before;
  const observed=found?{clicks:grouped.clicks,impressions:grouped.impressions,ctr:grouped.impressions?grouped.clicks/grouped.impressions:null,average_position:grouped.position_impressions?Number((grouped.position_weight/grouped.position_impressions).toFixed(1)):null}:null;
  let status='waiting_for_complete_postdeploy_window',reason='source_window_precedes_review_gate';
  if(completePostdeployWindow&&!observed){status='extend_observation';reason='page_absent_from_final_aggregate';}
  else if(completePostdeployWindow&&observed.impressions<experiment.guardrails.minimum_impressions_before_review){status='extend_observation';reason='minimum_impressions_not_met';}
  else if(completePostdeployWindow){status='ready_for_review';reason='complete_window_and_sample_gate_met';}
  return{schema_version:1,experiment_id:experiment.id,observed_at:gsc.window.to+'T23:59:59.000Z',status,reason,source_window:{...gsc.window,basis:'final_28d_page_aggregate',coverage:gsc.coverage.gsc},deployment:{verified_at:experiment.deployment.verified_at,review_not_before:experiment.deployment.review_not_before},baseline:experiment.baseline,observed,minimum_impressions_before_review:experiment.guardrails.minimum_impressions_before_review,sample_gate_met:status==='ready_for_review',content_change_frozen:true,next_experiment_allowed:false,automatic_site_change_allowed:false,automatic_publication_allowed:false};
}

export function recordExperimentObservation(storeRoot,report,key) {if(!validDay(report?.source_window?.to)||!/^[a-z0-9-]+$/.test(report?.experiment_id||''))throw new Error('Invalid experiment observation identity');return writeEncryptedJson(path.join(path.resolve(storeRoot),'experiments',`${report.experiment_id}__${report.source_window.to}.json.enc`),report,key);}
export function experimentObservationSummary(report) {return{schema_version:report.schema_version,experiment_id:report.experiment_id,status:report.status,reason:report.reason,source_window:report.source_window,deployment_review_not_before:report.deployment.review_not_before,sample_gate_met:report.sample_gate_met,content_change_frozen:true,next_experiment_allowed:false,automatic_site_change_allowed:false,automatic_publication_allowed:false,private_metrics_logged:false};}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;},store=value('--store'),ledger=value('--ledger-store'),experimentFile=value('--experiment'),out=value('--out');if(!store||!ledger||!experimentFile||!out)throw new Error('Usage: --store DIR --ledger-store DIR --experiment FILE --out FILE');const key=privateDataKey(),report=observeExperiment({experiment:readJson(experimentFile),gsc:loadLatestGsc(store,key)}),ledgerResult=recordExperimentObservation(ledger,report,key),target=path.resolve(out),working=path.resolve('ops/automation/working')+path.sep;if(!target.startsWith(working)||!target.endsWith('.json.enc'))throw new Error('Experiment output must be encrypted inside working');writeEncryptedJson(target,report,key);console.log(JSON.stringify({...experimentObservationSummary(report),ledger_record_created:ledgerResult.created}));}
