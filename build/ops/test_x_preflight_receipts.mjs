#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestFromCampaign } from './x_request_from_campaign.mjs';
import { evaluateXPublishPreflight } from './x_publish_executor.mjs';
import { loadXReceipt, recordXReceipt, validateXReceipt } from './x_receipt_store.mjs';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),campaign=readJson(path.join(root,'ops/automation/campaigns/x-launch-2026-08-31.json')),policy=readJson(path.join(root,'ops/automation/autonomy-policy.json'));
const verification={schema_version:1,status:'matched',base_url:'https://feeeye-site.pages.dev',build_id:'a'.repeat(64),source_revision:'b'.repeat(40),canonical_url_count:384,public_file_count:460,checked_at:'2026-09-03T07:00:00.000Z',attempts_used:2};
const bilingual={schema_version:1,status:'verified',base_url:'https://feeeye.com',fetch_base_url:'https://feeeye-site.pages.dev',build_id:verification.build_id,source_revision:verification.source_revision,checked_at:'2026-09-03T07:01:00.000Z',automatic_repair:false,distribution_allowed:true,failed_count:0,results:[{topic:'safe-crypto-transfer',status:'passed'}]};
const request=requestFromCampaign({campaign,postId:'transfer-en',verification,bilingualVerification:bilingual,policy,createdAt:'2026-09-03T07:02:00.000Z'});
assert.equal(request.request_id,`transfer-en-${'b'.repeat(12)}`);assert.equal(request.content_type,'evergreen_safety');assert.equal(request.not_before,'2026-09-03T07:07:00.000Z');assert.equal(request.expires_at,'2026-09-03T07:22:00.000Z');
const preflight=evaluateXPublishPreflight(request,policy,{now:'2026-09-03T07:07:00.000Z',liveFlag:false});assert.equal(preflight.dispatch_allowed,false);assert.equal(preflight.post_created,false);assert.ok(preflight.blockers.includes('mode_shadow'));
assert.throws(()=>requestFromCampaign({campaign,postId:'launch-en',verification,bilingualVerification:bilingual,policy,createdAt:'2026-09-03T07:02:00.000Z'}),/text-only/);
assert.throws(()=>requestFromCampaign({campaign,postId:'transfer-en',verification:{...verification,status:'mismatch'},bilingualVerification:bilingual,policy,createdAt:'2026-09-03T07:02:00.000Z'}),/deployment receipt/);
assert.throws(()=>requestFromCampaign({campaign,postId:'transfer-en',verification,bilingualVerification:{...bilingual,source_revision:'c'.repeat(40)},policy,createdAt:'2026-09-03T07:02:00.000Z'}),/bilingual production receipt/);
const receipt={schema_version:1,request_id:request.request_id,idempotency_key:request.gates.idempotency_key,account:'@FeeEyeOfficial',post_url:'https://x.com/FeeEyeOfficial/status/1234567890123456789',reconciled:false,post_created:true,recorded_at:'2026-09-03T07:08:00.000Z'};
validateXReceipt(receipt,request);const store=fs.mkdtempSync(path.join(os.tmpdir(),'feeeye-x-receipts-'));assert.equal(recordXReceipt(store,receipt,request).created,true);assert.equal(recordXReceipt(store,receipt,request).created,false);assert.deepEqual(loadXReceipt(store,receipt.idempotency_key),receipt);
assert.throws(()=>recordXReceipt(store,{...receipt,post_url:'https://x.com/FeeEyeOfficial/status/999'},request),/different immutable content/);
assert.throws(()=>validateXReceipt({...receipt,reconciled:true},request),/Invalid or mismatched/);
console.log('[OK] X preflight/receipts: exact deployed+bilingual source, text-only campaign allowlist, five-minute lead, shadow report, append-only idempotent receipt, and conflict rejection.');
