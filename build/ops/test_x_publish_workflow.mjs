#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './ops_util.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const workflow = fs.readFileSync(path.join(root, '.github/workflows/x-publish.yml'), 'utf8');

// Per-post confirmation, owner-controlled variable, and the same gate chain as the trial.
assert.match(workflow, /inputs\.confirmation == format\('PUBLISH_\{0\}_ONCE', inputs\.post_id\) && vars\.FEEEYE_X_PUBLISH == 'enabled'/);
assert.match(workflow, /type: choice/);
assert.ok(workflow.includes('- cost-en') && workflow.includes('- cost-zh') && workflow.includes('- transfer-zh'));
assert.ok(!workflow.includes('- transfer-en')); // already published via the one-shot trial
assert.match(workflow, /concurrency:\s*\n\s*group: x-receipt-ledger/);
assert.match(workflow, /contents: write/);
assert.ok(!workflow.includes('git push origin HEAD:main'));
assert.ok(workflow.includes('git add x'));
assert.match(workflow, /x_request_from_campaign\.mjs --post-id "\$POST_ID" --lead-minutes 0 --policy ops\/automation\/x-publish-policy\.json/);
assert.match(workflow, /FEEEYE_X_PUBLISHING_ENABLED: \$\{\{ vars\.FEEEYE_X_PUBLISH \}\}/);
assert.match(workflow, /validate_local\.mjs/);
assert.match(workflow, /live_bilingual_check\.mjs/);
assert.match(workflow, /wait_for_deployment\.mjs/);
assert.ok(workflow.includes('if: steps.receipt.outputs.exists != \'true\''));

// Policy keeps the trial guardrails: X-only channel, $5 monthly cap, no auto recharge.
const policy = readJson(path.join(root, 'ops/automation/x-publish-policy.json'));
assert.equal(policy.id, 'feeeye-x-publish-v1');
assert.equal(policy.publishing_enabled, true);
assert.equal(policy.budget.monthly_usd_cap, 5);
assert.equal(policy.budget.auto_recharge, false);
assert.equal(policy.channels.x.enabled, true);
assert.equal(policy.channels.website.enabled, false);
assert.ok(policy.blocked_content_types.includes('price_prediction'));
assert.deepEqual(policy.required_gates, ['source_current', 'deployment_verified', 'bilingual_verified', 'landing_pages_valid', 'idempotency_key']);

// Authorization boundary names the one approved post and the pending language decision.
const authorization = fs.readFileSync(path.join(root, 'docs/x-publish-authorization-2026-10-21.md'), 'utf8');
assert.match(authorization, /本次批准发布:`cost-en` 一条/);
assert.match(authorization, /尚未授权/);
assert.match(authorization, /PUBLISH_COST-EN_ONCE/);
assert.match(authorization, /\$5/);

console.log('[OK] x-publish: per-post confirmation gate, owner variable, trial-grade guard chain, frozen-campaign binding, and the cost-en authorization boundary.');
