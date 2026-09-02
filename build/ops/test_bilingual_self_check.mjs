#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEARNING_ARTICLES } from '../learning_content.mjs';
import { compareMultichannelBriefs } from './bilingual_parity.mjs';
import { buildMultichannelBrief } from './multichannel_brief.mjs';
import { waitForDeployment } from './wait_for_deployment.mjs';
import { checkLiveBilingual } from './live_bilingual_check.mjs';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),generatedAt='2026-09-02T08:00:00.000Z';
for(const article of LEARNING_ARTICLES){const en=buildMultichannelBrief({topicId:article.slug,locale:'en',generatedAt}),zh=buildMultichannelBrief({topicId:article.slug,locale:'zh',generatedAt}),report=compareMultichannelBriefs(en,zh);assert.equal(report.status,'passed');assert.equal(report.publication_allowed,false);assert.equal(report.automatic_repair,false);const broken=structuredClone(zh);broken.youtube.storyboard.pop();assert.equal(compareMultichannelBriefs(en,broken).status,'failed');}
const candidate=readJson(path.join(root,'dist/release.json')),revision='a'.repeat(40);let calls=0;
const observations=[];const receipt=await waitForDeployment({baseUrl:'https://feeeye.com',expectedRevision:revision,expectedBuildId:candidate.build_id,attempts:3,delayMs:0,timeoutMs:1000,sleep:async()=>{},checkedAt:()=>generatedAt,onAttempt:value=>observations.push(value),fetchImpl:async()=>new Response(JSON.stringify(++calls<2?{build_id:'old',source_revision:'b'.repeat(40)}:{build_id:candidate.build_id,source_revision:revision,canonical_url_count:384,public_file_count:457}),{status:200,headers:{'content-type':'application/json'}})});assert.equal(receipt.attempts_used,2);assert.deepEqual(observations.map(x=>x.status),['mismatch','matched']);
await assert.rejects(()=>waitForDeployment({baseUrl:'https://feeeye.com',expectedRevision:revision,expectedBuildId:candidate.build_id,attempts:1,delayMs:0,sleep:async()=>{},fetchImpl:async()=>new Response('{}',{status:200})}),/did not match/);
const localFetch=async url=>{const parsed=new URL(url),file=parsed.pathname==='/release.json'?path.join(root,'dist/release.json'):path.join(root,'dist',parsed.pathname.replace(/^\//,'')+'.html');if(!fs.existsSync(file))return new Response('missing',{status:404});return new Response(fs.readFileSync(file),{status:200,headers:{'content-type':parsed.pathname==='/release.json'?'application/json':'text/html'}});};
const localRelease={...candidate,source_revision:revision};const fetchWithRelease=async url=>new URL(url).pathname==='/release.json'?new Response(JSON.stringify(localRelease),{status:200,headers:{'content-type':'application/json'}}):localFetch(url);
const live=await checkLiveBilingual({baseUrl:'https://feeeye.com',expectedRelease:{...receipt,build_id:candidate.build_id,source_revision:revision,status:'matched'},fetchImpl:fetchWithRelease,checkedAt:generatedAt});assert.equal(live.status,'verified');assert.equal(live.results.length,8);assert.equal(live.distribution_allowed,true);
const brokenFetch=async url=>{const response=await fetchWithRelease(url);if(new URL(url).pathname==='/zh/learn/safe-crypto-transfer')return new Response((await response.text()).replace('hreflang="en"','hreflang="xx"'),{status:200,headers:{'content-type':'text/html'}});return response;};
const brokenLive=await checkLiveBilingual({baseUrl:'https://feeeye.com',expectedRelease:{...receipt,status:'matched'},fetchImpl:brokenFetch,checkedAt:generatedAt});assert.equal(brokenLive.status,'failed');assert.equal(brokenLive.distribution_allowed,false);
console.log('[OK] Bilingual self-check: prepublish brief parity, exact deployment wait, reciprocal live pages, source/FAQ/risk checks and fail-closed distribution gate.');
