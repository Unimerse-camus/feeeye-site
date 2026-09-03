#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),workflow=fs.readFileSync(path.join(root,'.github/workflows/x-live-trial.yml'),'utf8'),policy=readJson(path.join(root,'ops/automation/autonomy-policy.json'));
assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/\bschedule:/);assert.match(workflow,/inputs\.confirmation == 'PUBLISH_TRANSFER_EN_ONCE'/);assert.match(workflow,/vars\.FEEEYE_X_LIVE_TRIAL == 'enabled'/);
assert.match(workflow,/ref: automation-receipts/);assert.ok(workflow.indexOf('ref: automation-receipts')<workflow.indexOf('Publish exactly one root post'));assert.match(workflow,/--lookup --store \.\.\/receipt-ledger/);assert.match(workflow,/steps\.receipt\.outputs\.exists != 'true'/);
for(const secret of ['FEEEYE_X_CONSUMER_KEY','FEEEYE_X_CONSUMER_SECRET','FEEEYE_X_ACCESS_TOKEN','FEEEYE_X_ACCESS_TOKEN_SECRET'])assert.match(workflow,new RegExp(`secrets\\.${secret}`));
assert.match(workflow,/--post-id transfer-en --lead-minutes 0/);assert.match(workflow,/--execute --out ops\/automation\/working\/x-receipt\.json/);assert.match(workflow,/git push origin HEAD:automation-receipts/);assert.doesNotMatch(workflow,/POST \/2\/tweets|curl .*api\.x\.com/);
assert.equal(policy.mode,'shadow');assert.equal(policy.publishing_enabled,false);assert.equal(policy.channels.x.enabled,false);assert.equal(policy.budget.monthly_usd_cap,5);assert.equal(policy.budget.auto_recharge,false);
console.log('[OK] X live trial workflow: manual exact phrase, repository variable, shadow policy, pre-existing receipt branch, preflight-before-X, immutable receipt, one fixed post, and no schedule.');
