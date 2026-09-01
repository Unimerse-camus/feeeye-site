#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { digest, snapshotHash, snapshot, chartPath } from './benchmark.mjs';
import { sourceReview, reviewHash, assessReview } from './source_review.mjs';

export function validatePack(directory) {
  const m = JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
  if (m.schema_version !== 1 || m.campaign_id !== '1000-usdt-fee' || m.snapshot_version !== snapshot.version || m.snapshot_hash !== snapshotHash || m.status !== 'draft' || m.publishing_enabled !== false || m.approval !== null || !Array.isArray(m.published_urls) || m.published_urls.length) throw new Error('Invalid draft or stale snapshot');
  const readiness=assessReview(sourceReview,sourceReview.observed_at);
  if(m.review_hash!==reviewHash || m.promotion_hold!==!readiness.current_claims_ready) throw new Error('Stale review or invalid promotion hold');
  if (!m.files || m.content_hash !== digest(JSON.stringify(m.files))) throw new Error('Invalid manifest hash');
  const required = ['facts.json','fees.csv','source-review.json','source-review.md','readiness.json',...['en','zh'].flatMap(l=>[`page-${l}.html`,`chart-${l}.svg`,`x-${l}.json`,`review-${l}.md`,`video-script-${l}.md`]),...(m.png_ready?['chart-en.png','chart-zh.png']:[])].sort();
  if (JSON.stringify(Object.keys(m.files).sort()) !== JSON.stringify(required)) throw new Error('Unexpected file inventory');
  if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify([...required,'manifest.json'].sort())) throw new Error('Untracked file in review pack');
  for (const [name,hash] of Object.entries(m.files)) {
    if (!/^[a-z0-9.-]+$/.test(name) || fs.lstatSync(path.join(directory,name)).isSymbolicLink()) throw new Error('Unsafe pack path');
    if (digest(fs.readFileSync(path.join(directory,name))) !== hash) throw new Error('Changed content: '+name);
  }
  if (digest(JSON.stringify(JSON.parse(fs.readFileSync(path.join(directory,'facts.json'))))) !== snapshotHash) throw new Error('Fact mismatch');
  if (digest(JSON.stringify(JSON.parse(fs.readFileSync(path.join(directory,'source-review.json'))))) !== reviewHash) throw new Error('Review mismatch');
  if (JSON.stringify(JSON.parse(fs.readFileSync(path.join(directory,'readiness.json')))) !== JSON.stringify(readiness)) throw new Error('Readiness mismatch');
  const config = JSON.parse(fs.readFileSync(new URL('../../ops/automation/config.json',import.meta.url)));
  if (config.publishing_enabled !== false || Object.values(config.channels).some(Boolean)) throw new Error('Publishing must remain off');
  for (const lang of ['en','zh']) {
    const posts = JSON.parse(fs.readFileSync(path.join(directory,`x-${lang}.json`)));
    if (posts.status !== 'draft' || posts.account !== null || posts.posts.length !== 3) throw new Error('Invalid social draft');
    for (const post of posts.posts) {
      // Conservative weighted length: non-ASCII counts as two, each URL as 23.
      const noURL = post.text.replace(/https:\/\/\S+/g, 'x'.repeat(23));
      const weight = [...noURL].reduce((sum,c)=>sum+(c.codePointAt(0)>0x7ff?2:1),0);
      if (post.approved !== false || weight > 280 || !post.text.includes(snapshot.source_reviewed_at)) throw new Error('Unsafe/oversize social draft');
    }
    const page = fs.readFileSync(path.join(directory,`page-${lang}.html`),'utf8');
    if (!page.includes(chartPath(lang)) || page.includes('手续费实测') || page.includes('After fee') || page.includes('扣费后等值')) throw new Error('Page contract violation');
  }
  return m;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: node build/ops/validate_content_pack.mjs <local pack directory>');
  const m = validatePack(path.resolve(process.argv[2]));
  console.log('[OK] Draft integrity verified; this is NOT source verification or publishing approval: '+m.content_hash);
  console.log(JSON.stringify({current_evidence_assessment:assessReview(),publication_allowed:false}));
}
