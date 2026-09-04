#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEARNING_ARTICLES } from '../learning_content.mjs';
import { buildFeedbackImprovementQueue, feedbackQueueSummary, validateFeedbackAggregate } from './feedback_improvement_queue.mjs';
import { readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),zero=()=>({unclear:0,missing_step:0,outdated:0,broken_link:0,other:0}),articles=LEARNING_ARTICLES.flatMap(item=>['en','zh'].map(locale=>({article_id:item.slug,locale,article_end_views:20,helpful_yes:0,helpful_no:0,reasons:zero()}))),data={schema_version:1,window:{from:'2026-09-01',to:'2026-09-28'},coverage:{zaraz:{status:'complete',through:'2026-09-28',note_code:'complete_aggregate_export'}},articles};
const target=articles.find(row=>row.article_id==='safe-crypto-transfer'&&row.locale==='zh');target.helpful_yes=3;target.helpful_no=3;target.reasons.unclear=2;target.reasons.missing_step=1;
const urgent=articles.find(row=>row.article_id==='crypto-total-cost'&&row.locale==='en');urgent.helpful_yes=1;urgent.helpful_no=2;urgent.reasons.broken_link=2;
validateFeedbackAggregate(data);const queue=buildFeedbackImprovementQueue(data);assert.equal(queue.status,'improvement_candidates_ready');assert.equal(queue.decision,'prepare_bilingual_revision_evidence');assert.equal(queue.candidate_count,2);assert.equal(queue.candidates[0].priority,'urgent_review');assert.deepEqual(queue.candidates[0].actions,['verify_links']);assert.equal(queue.candidates[1].negative_rate,.5);assert.equal(queue.candidates[1].counterpart_locale_required,true);assert.equal(queue.guardrails.free_text_accepted,false);assert.equal(queue.guardrails.user_feedback_is_evidence_not_fact,true);assert.equal(queue.guardrails.automatic_content_change_allowed,false);assert.equal(queue.guardrails.automatic_publication_allowed,false);const summary=feedbackQueueSummary(queue);assert.equal(summary.private_metrics_logged,false);assert.doesNotMatch(JSON.stringify(summary),/safe-crypto-transfer|impressions|helpful|unclear|broken_link/);
const sparse=structuredClone(data);for(const row of sparse.articles){row.helpful_yes=0;row.helpful_no=0;row.reasons=zero();}const observed=buildFeedbackImprovementQueue(sparse);assert.equal(observed.status,'observe');assert.equal(observed.candidate_count,0);
const bad=structuredClone(data);bad.articles[0].reasons.unclear++;assert.throws(()=>validateFeedbackAggregate(bad),/totals conflict/);assert.throws(()=>validateFeedbackAggregate({...data,comment:'please change this'}),/Unexpected fields/);
const key=Buffer.alloc(32,8),privateDir=fs.mkdtempSync(path.join(os.tmpdir(),'feeeye-feedback-')),encrypted=path.join(privateDir,'feedback-queue.json.enc');writeEncryptedJson(encrypted,queue,key);assert.deepEqual(readEncryptedJson(encrypted,key),queue);assert.doesNotMatch(fs.readFileSync(encrypted,'utf8'),/safe-crypto-transfer|helpful|unclear|broken_link|feeeye\.com/);
const html=fs.readFileSync(path.join(root,'dist/zh/learn/safe-crypto-transfer.html'),'utf8');assert.match(html,/data-content-feedback/);assert.match(html,/data-feedback-value="needs_improvement"/);assert.match(html,/反馈只用于生成内容复核候选/);assert.doesNotMatch(html,/<textarea|type="email"|contenteditable/);
console.log('[OK] Feedback improvement queue: fixed categories, complete bilingual inventory, sparse-sample hold, urgent integrity review, encrypted-ready private details, and no automatic content changes.');
