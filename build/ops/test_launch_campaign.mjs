#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const campaign=JSON.parse(fs.readFileSync(path.join(root,'ops/automation/campaigns/x-launch-2026-08-31.json')));
assert.equal(campaign.publishing_enabled,false);
assert.equal(campaign.account,null);
assert.equal(campaign.status,'draft');
assert.equal(campaign.approval,null);
assert.ok(campaign.bio_en.length<=160);
assert.equal(campaign.posts.length,6);
assert.equal(new Set(campaign.posts.map(p=>p.id)).size,6);
const analytics=fs.readFileSync(path.join(root,'assets/analytics.js'),'utf8');
for(const post of campaign.posts) {
  assert.ok(['zh','en'].includes(post.locale));
  const urls=post.text.match(/https:\/\/\S+/g)||[];
  assert.equal(urls.length,1);
  const url=new URL(urls[0]);
  assert.equal(url.origin,'https://feeeye.com');
  assert.equal(url.searchParams.get('utm_campaign'),campaign.id);
  const article=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname+'.html';
  assert.ok(fs.existsSync(path.join(root,'dist',article)),'Missing landing page');
  const body=post.text.replace(urls[0],'');
  assert.ok(!/[0-9%$]/.test(body),'Brand launch must not silently acquire numeric fee claims');
  assert.ok([...body].reduce((n,c)=>n+(c.codePointAt(0)>0x7ff?2:1),23)<=280);
  if(post.image) assert.ok(fs.existsSync(path.join(root,post.image)));
  const events=[];
  const win={zaraz:{track:(name,payload)=>events.push(payload)}};
  vm.runInNewContext(analytics,{window:win,document:{documentElement:{lang:post.locale},addEventListener:()=>{}},location:{pathname:url.pathname,search:url.search},URLSearchParams,Promise});
  win.FeeEyeAnalytics.track('coin_search_open');
  assert.equal(events[0].utm_campaign,campaign.id,'Campaign must be registered');
}
console.log('[OK] Launch drafts: bilingual count, landing pages, existing artwork, post limits, UTM registry and publishing disabled.');
