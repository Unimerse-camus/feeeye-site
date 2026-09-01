#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sourceReview, validateReview, assessReview, reviewMarkdown } from './source_review.mjs';
import { snapshot } from './benchmark.mjs';

const a=assessReview(sourceReview,'2026-08-31');
assert.equal(a.confirmed_in_scope,4);
assert.equal(a.current_claims_ready,false);
assert.equal(a.publication_allowed,false);
assert.deepEqual(a.issues.map(x=>x.slug),['binance','okx','coinbase']);
assert.ok(assessReview(sourceReview,'2026-09-08').issues.some(x=>x.reason==='review_expired'));
assert.ok(assessReview(sourceReview,'2026-08-30').issues.some(x=>x.reason==='future_observation'));
assert.throws(()=>assessReview(sourceReview,'2026-02-31'));
for(const mutate of [r=>r.records.pop(),r=>r.records.push(r.records[0]),r=>r.base_snapshot_hash='stale',r=>r.records[0].sources=['https://binance.com.evil.test/fee'],r=>r.records[5].rate_ppm=6000,r=>r.records[0].status='approved']) {
  const r=structuredClone(sourceReview);mutate(r);assert.throws(()=>validateReview(r));
}
// Synthetic evidence success is still NOT publication authority.
const synthetic=structuredClone(sourceReview);
for(const r of synthetic.records) {const base=snapshot.rows.find(x=>x.slug===r.slug);r.status='confirmed_in_scope';r.rate_ppm=base.rate_ppm;r.kind=base.kind;}
assert.equal(assessReview(synthetic,'2026-08-31').current_claims_ready,true);
assert.equal(assessReview(synthetic,'2026-08-31').publication_allowed,false);
synthetic.records[0].rate_ppm=2000;
assert.ok(assessReview(synthetic,'2026-08-31').issues.some(x=>x.reason==='snapshot_mismatch'));
assert.ok(reviewMarkdown().includes('当前费率宣传被拦截'));
assert.throws(()=>execFileSync(process.execPath,['build/ops/source_review.mjs','--require-current'],{cwd:new URL('../../',import.meta.url),stdio:'pipe'}),e=>e.status===2);
console.log('[OK] Evidence preflight: missing, stale, future, scope conflict, changed rate and unauthorized publication checks.');
