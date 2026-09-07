#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCoinUrlRegistry, mergeCoinUrlRegistry } from '../coin_url_registry.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const registry=loadCoinUrlRegistry(path.join(root,'data','coin-url-registry.json'));
const reported404Paths=['/where-to-buy/velvet.html','/where-to-buy/cyberleek.html','/zh/where-to-buy/fartcoin.html','/where-to-buy/velvet','/zh/where-to-buy/ansem.html','/where-to-buy/ansem.html','/where-to-buy/cyberleek','/zh/where-to-buy/ake.html','/where-to-buy/catalorian','/zh/where-to-buy/ansem','/where-to-buy/ansem','/where-to-buy/catalorian.html','/zh/where-to-buy/apepe','/zh/where-to-buy/fartcoin','/zh/where-to-buy/jto.html','/where-to-buy/basecat','/where-to-buy/usdt.html','/zh/where-to-buy/fold.html','/where-to-buy/kntq','/zh/where-to-buy/cfg.html','/where-to-buy/figr_heloc.html','/where-to-buy/dai.html','/zh/where-to-buy/','/where-to-buy/','/zh/where-to-buy/cyberleek','/zh/where-to-buy/peaq.html','/where-to-buy/usds.html','/zh/where-to-buy/apepe.html','/zh/where-to-buy/jasmy.html','/zh/where-to-buy/real.html','/zh/where-to-buy/cfx.html','/zh/where-to-buy/nct.html','/where-to-buy/cfx.html','/zh/where-to-buy/basecat','/where-to-buy/zano'];
for(const pathname of reported404Paths){const relative=pathname.replace(/^\//,'').replace(/\/$/,'/index.html').replace(/(?<!\.html)$/i,'.html');assert.ok(fs.existsSync(path.join(root,'dist',relative)),`Missing GSC 404 repair target: ${pathname}`);}
const merged=mergeCoinUrlRegistry(registry,[{symbol:'OLD',name:'Old Coin',cg_id:'old',last_updated:'2026-09-06'}],[{symbol:'NEW',name:'New Coin',cg_id:'new',last_updated:'2026-09-07'}],'2026-09-07');
assert.ok(merged.coins.some(c=>c.symbol==='OLD'&&c.last_seen==='2026-09-06'));
assert.ok(merged.coins.some(c=>c.symbol==='NEW'&&c.last_seen==='2026-09-07'));
for(const locale of ['', 'zh/']){
  const retired=fs.readFileSync(path.join(root,'dist',locale,'where-to-buy','velvet.html'),'utf8');
  assert.match(retired,/<meta name="robots" content="noindex, follow">/);
  assert.match(retired,/2026-08-23/);
  const directory=fs.readFileSync(path.join(root,'dist',locale,'where-to-buy','index.html'),'utf8');
  assert.doesNotMatch(directory,/<meta name="robots" content="noindex/);
  assert.match(directory,/where-to-buy\/btc\.html/);
}
const active=fs.readFileSync(path.join(root,'dist','where-to-buy','real.html'),'utf8');
assert.doesNotMatch(active,/<meta name="robots" content="noindex/);
const sitemap=fs.readFileSync(path.join(root,'dist','sitemap.xml'),'utf8');
assert.match(sitemap,/<loc>https:\/\/feeeye.com\/where-to-buy\/<\/loc>/);
assert.doesNotMatch(sitemap,/where-to-buy\/velvet/);
const workflow=fs.readFileSync(path.join(root,'.github','workflows','refresh-coins.yml'),'utf8');
assert.match(workflow,/git add data\/coins\.json data\/coin-url-registry\.json data\/exchanges\.js/);
console.log('[OK] Coin URL retention: stable directory, bilingual noindex tombstones, current-page precedence, sitemap exclusion, and refresh persistence.');
