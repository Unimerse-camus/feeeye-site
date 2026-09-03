#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),workflow=fs.readFileSync(path.join(root,'.github/workflows/x-live-trial.yml'),'utf8'),policy=readJson(path.join(root,'ops/automation/autonomy-policy.json')),trialPolicy=readJson(path.join(root,'ops/automation/x-live-trial-policy.json'));
assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/\bschedule:/);assert.match(workflow,/inputs\.confirmation == 'PUBLISH_TRANSFER_EN_ONCE'/);assert.match(workflow,/vars\.FEEEYE_X_LIVE_TRIAL == 'enabled'/);
assert.match(workflow,/ref: automation-receipts/);assert.ok(workflow.indexOf('ref: automation-receipts')<workflow.indexOf('Publish exactly one root post'));assert.match(workflow,/--lookup --store \.\.\/receipt-ledger/);assert.match(workflow,/steps\.receipt\.outputs\.exists != 'true'/);
for(const secret of ['FEEEYE_X_CONSUMER_KEY','FEEEYE_X_CONSUMER_SECRET','FEEEYE_X_ACCESS_TOKEN','FEEEYE_X_ACCESS_TOKEN_SECRET'])assert.match(workflow,new RegExp(`secrets\\.${secret}`));
assert.match(workflow,/--post-id transfer-en --lead-minutes 0 --policy ops\/automation\/x-live-trial-policy\.json/);assert.match(workflow,/--policy ops\/automation\/x-live-trial-policy\.json --execute --out ops\/automation\/working\/x-receipt\.json/);assert.match(workflow,/git push origin HEAD:automation-receipts/);assert.doesNotMatch(workflow,/POST \/2\/tweets|curl .*api\.x\.com/);
assert.equal(policy.mode,'shadow');assert.equal(policy.publishing_enabled,false);assert.equal(policy.channels.x.enabled,false);assert.equal(policy.budget.monthly_usd_cap,5);assert.equal(policy.budget.auto_recharge,false);
assert.equal(trialPolicy.mode,'autonomous');assert.equal(trialPolicy.publishing_enabled,true);assert.equal(trialPolicy.channels.x.enabled,true);assert.equal(trialPolicy.channels.x.executor,'official_x_api');assert.equal(trialPolicy.budget.monthly_usd_cap,5);assert.equal(trialPolicy.budget.auto_recharge,false);assert.equal(Object.entries(trialPolicy.channels).filter(([,value])=>value.enabled).map(([id])=>id).join(','),'x');
console.log('[OK] X live trial workflow: manual exact phrase, repository variable, global shadow policy, isolated one-channel trial policy, pre-existing receipt branch, preflight-before-X, immutable receipt, one fixed post, and no schedule.');
