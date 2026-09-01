#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEARNING_ARTICLES } from '../learning_content.mjs';
import { buildTopicQueue, validateEditorialSignals } from './topic_queue.mjs';
import { buildMultichannelBrief, validateMultichannelBrief } from './multichannel_brief.mjs';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const input=readJson(path.join(root,'ops/automation/metrics/editorial-signals.example.json'));
assert.equal(buildTopicQueue(input).candidates.length,0);
const signals=structuredClone(input);
const transfer=signals.topics.find(x=>x.id==='safe-crypto-transfer');transfer.community_questions=7;transfer.search_impressions=90;transfer.search_clicks=4;
const cost=signals.topics.find(x=>x.id==='crypto-total-cost');cost.community_questions=3;cost.search_impressions=300;cost.ai_citations=2;
const scams=signals.topics.find(x=>x.id==='avoid-crypto-scams');scams.community_questions=7;scams.search_impressions=50;
const queue=buildTopicQueue(signals);assert.deepEqual(queue.candidates.map(x=>x.id).slice(0,3),['safe-crypto-transfer','avoid-crypto-scams','crypto-total-cost']);assert.equal(queue.selection_required,true);assert.equal(queue.automatic_publication,false);
const stale=structuredClone(signals);stale.topics.find(x=>x.id==='safe-crypto-transfer').evidence_status='stale';assert.equal(buildTopicQueue(stale).holds[0].reason,'evidence_stale');
const leaked=structuredClone(input);leaked.topics[0].raw_query='wallet address';assert.throws(()=>validateEditorialSignals(leaked),/Unexpected fields/);
const freeText=structuredClone(input);freeText.notes=['user query'];assert.throws(()=>validateEditorialSignals(freeText),/Unexpected fields/);
const extraCoverage=structuredClone(input);extraCoverage.coverage.user_posts={status:'complete',through:'2026-09-01',note_code:'complete_aggregate_export'};assert.throws(()=>validateEditorialSignals(extraCoverage),/Unexpected fields/);
const missing=structuredClone(input);missing.topics.pop();assert.throws(()=>validateEditorialSignals(missing),/cover every registered/);
for(const article of LEARNING_ARTICLES)for(const locale of ['en','zh']) {
  const brief=buildMultichannelBrief({topicId:article.slug,locale,generatedAt:'2026-09-01T15:00:00.000Z'});
  assert.equal(brief.publishing_enabled,false);assert.equal(brief.youtube.automatic_upload,false);assert.equal(brief.community.automatic_posting,false);assert.ok(brief.sources.length);assert.ok(brief.seo_geo.canonical.startsWith('https://feeeye.com/'));assert.equal(validateMultichannelBrief(brief),brief);
}
const brief=buildMultichannelBrief({topicId:'safe-crypto-transfer',locale:'en',generatedAt:'2026-09-01T15:00:00.000Z'});
assert.throws(()=>validateMultichannelBrief({...brief,publishing_enabled:true}),/stale or modified/);
assert.throws(()=>buildMultichannelBrief({topicId:'unknown',locale:'en'}),/Unknown registered topic/);
console.log('[OK] Editorial pipeline: private aggregate signals, human topic selection, source-bound SEO/GEO brief, YouTube storyboard, community answer kit, and disabled external actions.');
