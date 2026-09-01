#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { snapshot, validateSnapshot, benchmarkRows, chartSvg, chartPath, digest } from './benchmark.mjs';
import { updateExchangeMetadata } from '../fetch_exchange_meta.mjs';
import { validatePack } from './validate_content_pack.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const load=src=>{const ctx={window:{}};vm.runInNewContext(src,ctx);return JSON.parse(JSON.stringify(ctx.window));};
const original=fs.readFileSync(path.join(root,'data/exchanges.js'),'utf8');
const before=load(original);
const retrieved='2026-08-31T08:00:00.000Z';
const detail={coins:800,trust_score:8,trade_volume_24h_btc:12000};
const updated=updateExchangeMetadata(original,'binance',detail,100000,retrieved);
const after=load(updated);
assert.deepEqual(after.EXCHANGES,before.EXCHANGES,'Fee evidence and dates must not be touched');
assert.equal(after.EXCHANGE_COMPARE.binance.coins,800);
assert.equal(after.EXCHANGE_COMPARE.binance.volume,'≈$1.2B');
assert.equal(after.EXCHANGE_COMPARE.binance.market_data_retrieved_at.volume,retrieved);
for(const slug of Object.keys(before.EXCHANGE_COMPARE).filter(s=>s!=='binance')) assert.deepEqual(after.EXCHANGE_COMPARE[slug],before.EXCHANGE_COMPARE[slug]);
assert.equal(updateExchangeMetadata(updated,'binance',detail,100000,retrieved),updated,'Same observation is idempotent');
for(const invalid of [{},{coins:NaN,trust_score:8},{coins:800,trust_score:11},{coins:0,trust_score:8}]) assert.equal(updateExchangeMetadata(original,'binance',invalid,100000,retrieved),original);
const partial=load(updateExchangeMetadata(updated,'binance',{...detail,coins:801},0,'2026-08-31T09:00:00Z'));
assert.equal(partial.EXCHANGE_COMPARE.binance.volume,'≈$1.2B');
assert.equal(partial.EXCHANGE_COMPARE.binance.market_data_retrieved_at.volume,retrieved,'Failed volume refresh must not freshen its date');
assert.equal(partial.EXCHANGE_COMPARE.binance.market_data_retrieved_at.coins,'2026-08-31T09:00:00Z');
assert.equal(load(updateExchangeMetadata(original,'binance',{...detail,trade_volume_24h_btc:0},100000,retrieved)).EXCHANGE_COMPARE.binance.volume,'≈$0B');
assert.equal(load(updateExchangeMetadata(original,'binance',{...detail,trade_volume_24h_btc:Number.MAX_VALUE},Number.MAX_VALUE,retrieved)).EXCHANGE_COMPARE.binance.volume,before.EXCHANGE_COMPARE.binance.volume);
assert.throws(()=>updateExchangeMetadata(original,'missing',detail,100000,retrieved));
console.log('[OK] Market refresh: fee dates preserved; failed/partial/repeated inputs safe.');

const rows=benchmarkRows();
assert.deepEqual(rows.map(r=>r.fee),[1,1,1,1,1,6,8]);
assert.equal(rows.find(r=>r.slug==='coinbase').kind,'ceiling');
assert.ok(rows.every(r=>!('remainder' in r)));
for(const mutate of [s=>s.rows[0].rate_ppm=-1,s=>s.rows[0].source='https://binance.com.evil.test/fees',s=>s.rows[0].verified_at='2026-02-31',s=>s.rows.push(s.rows[0]),s=>s.exclusions=[]]) {
  const s=structuredClone(snapshot);mutate(s);assert.throws(()=>validateSnapshot(s));
}
const alternative=structuredClone(snapshot);alternative.rows[0].rate_ppm=2000;
assert.equal(benchmarkRows(alternative)[0].fee,2);
assert.notEqual(digest(chartSvg('zh',alternative)),digest(chartSvg('zh')));
for(const lang of ['en','zh']) {
  const html=fs.readFileSync(path.join(root,'dist',lang==='zh'?'zh':'','research',snapshot.id+'.html'),'utf8');
  assert.ok(html.includes(chartPath(lang)));
  assert.ok(html.includes('HISTORICAL SNAPSHOT'));
  assert.match(html,/\/assets\/analytics\.[a-f0-9]{16}\.js/);
  assert.ok(!html.includes('费率实测') && !html.includes('扣费后等值') && !html.includes('After fee'));
  assert.equal(fs.readFileSync(path.join(root,'dist',chartPath(lang)),'utf8'),chartSvg(lang));
  const data=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  const article=data.flatMap(x=>x['@graph']||[]).find(x=>x['@type']==='Article');
  assert.equal(article.dateModified,snapshot.editorial_updated_at);
}
const sitemap=fs.readFileSync(path.join(root,'dist/sitemap.xml'),'utf8');
const tool=fs.readFileSync(path.join(root,'dist/tools/total-cost-calculator.zh.html'),'utf8');
assert.match(tool,/\/assets\/analytics\.[a-f0-9]{16}\.js/);
assert.match(tool,/\/assets\/learning-nav\.[a-f0-9]{16}\.js/);
assert.ok(!tool.includes('费率实测'));
assert.equal((sitemap.match(/<lastmod>/g)||[]).length,2);
assert.ok(sitemap.includes(`<lastmod>${snapshot.editorial_updated_at}</lastmod>`));
console.log('[OK] Frozen arithmetic, official-source contracts, multilingual pages, chart hashes, honest sitemap.');

const output=JSON.parse(execFileSync(process.execPath,['build/ops/build_content_pack.mjs'],{cwd:root,encoding:'utf8'}));
const pack=validatePack(output.output);
const repeat=JSON.parse(execFileSync(process.execPath,['build/ops/build_content_pack.mjs'],{cwd:root,encoding:'utf8'}));
assert.equal(repeat.content_hash,output.content_hash);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'feeeye-pack-test-'));
try {
  fs.cpSync(output.output,tmp,{recursive:true});
  fs.appendFileSync(path.join(tmp,'x-en.json'),'tampered');
  assert.throws(()=>validatePack(tmp),/Changed content/);
  fs.copyFileSync(path.join(output.output,'x-en.json'),path.join(tmp,'x-en.json'));
  const bad={...pack,approval:{approved:true}};
  fs.writeFileSync(path.join(tmp,'manifest.json'),JSON.stringify(bad));
  assert.throws(()=>validatePack(tmp),/Invalid draft/);
  fs.writeFileSync(path.join(tmp,'manifest.json'),JSON.stringify({...pack,snapshot_hash:'stale'}));
  assert.throws(()=>validatePack(tmp),/stale snapshot/);
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
console.log('[OK] Draft generation, repeatability, inventory, mutation detection, approval and stale-snapshot rejection.');
