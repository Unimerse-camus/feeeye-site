#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const experiment=readJson(path.join(root,'ops/automation/experiments/zh-home-snippet-2026-09-02.json'));
assert.deepEqual(Object.keys(experiment).sort(),['after','approval_required','baseline','before','canonical','change_scope','deployment_verified','guardrails','hypothesis','id','locale','schema_version','status'].sort());
assert.equal(experiment.schema_version,1);assert.equal(experiment.status,'candidate');assert.equal(experiment.canonical,'https://feeeye.com/zh/');assert.equal(experiment.locale,'zh');assert.equal(experiment.approval_required,true);assert.equal(experiment.deployment_verified,false);
assert.deepEqual(experiment.change_scope,['title','description','h1']);assert.equal(experiment.baseline.impressions,71);assert.equal(experiment.baseline.clicks,0);assert.equal(experiment.baseline.average_position,4.2);assert.equal(experiment.baseline.coverage,'partial');
assert.deepEqual(experiment.guardrails,{observation_days_after_deployment:28,minimum_impressions_before_review:30,no_new_page:true,no_interim_copy_changes:true,raw_queries_stored:false});
const html=fs.readFileSync(path.join(root,'dist/zh/index.html'),'utf8');
assert.ok(html.includes(`<title>${experiment.after.title}</title>`));assert.ok(html.includes(`<meta name="description" content="${experiment.after.description}">`));assert.ok(html.includes(`<h1>${experiment.after.h1}</h1>`));
for(const old of Object.values(experiment.before))assert.ok(!html.includes(old));
console.log('[OK] Chinese home snippet experiment: one recorded copy scope, partial baseline, rendered candidate, 28-day freeze and no raw queries.');
