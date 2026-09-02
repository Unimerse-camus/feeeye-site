#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPageOpportunityQueue, canonicalizeFeeEyeUrl, validatePageSignals } from './page_opportunity_queue.mjs';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const empty=readJson(path.join(root,'ops/automation/metrics/page-signals.example.json'));assert.equal(buildPageOpportunityQueue(empty).candidates.length,0);
assert.equal(canonicalizeFeeEyeUrl('https://feeeye.com/where-to-buy/xdc.html'),'https://feeeye.com/where-to-buy/xdc');
const data=structuredClone(empty);data.coverage.gsc={status:'partial',through:'2026-08-30',note_code:'partial_aggregate_export'};data.pages=[
  {url:'https://feeeye.com/where-to-buy/xdc',clicks:0,impressions:155,average_position:68.6},
  {url:'https://feeeye.com/where-to-buy/xdc.html',clicks:0,impressions:29,average_position:60.8},
  {url:'https://feeeye.com/zh/',clicks:0,impressions:71,average_position:4.2},
  {url:'https://feeeye.com/compare/binance-vs-okx',clicks:0,impressions:33,average_position:57.6}
];
const queue=buildPageOpportunityQueue(data);assert.equal(queue.input_rows,4);assert.equal(queue.canonical_pages,3);assert.equal(queue.candidates[0].impressions,184);assert.equal(queue.candidates[0].observed_variants.length,2);assert.ok(queue.candidates[0].actions.includes('canonical_consolidation_check'));assert.ok(queue.candidates[0].actions.includes('snippet_and_intent_review'));assert.equal(queue.automatic_page_creation,false);assert.equal(queue.automatic_publication,false);
const raw=structuredClone(data);raw.pages[0].query='where buy';assert.throws(()=>validatePageSignals(raw),/Unexpected fields/);
const missingCoverage=structuredClone(data);missingCoverage.coverage.gsc={status:'missing',through:null,note_code:'no_authorized_export'};assert.throws(()=>validatePageSignals(missingCoverage),/Coverage status conflicts/);
const duplicate=structuredClone(data);duplicate.pages.push(structuredClone(duplicate.pages[0]));assert.throws(()=>validatePageSignals(duplicate),/Duplicate page rows/);
const tracked=structuredClone(data);tracked.pages[0].url+='?user=1';assert.throws(()=>validatePageSignals(tracked),/clean public/);
const unknown=structuredClone(data);unknown.pages[0].url='https://feeeye.com/not-registered';assert.throws(()=>validatePageSignals(unknown),/Invalid or unregistered/);
console.log('[OK] Page opportunity queue: public page metrics only, canonical variant merging, evidence thresholds, existing-page review and disabled automatic creation.');
