#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const policy=readJson(path.join(root,'ops/automation/channel-policy.json'));
assert.deepEqual(Object.keys(policy).sort(),['active_channels','budget','comparison_gate','deferred_channels','id','observation_days','publishing_enabled','schema_version','status'].sort());
assert.equal(policy.schema_version,1);assert.equal(policy.status,'draft');assert.equal(policy.budget,'free_only');assert.equal(policy.observation_days,28);assert.equal(policy.publishing_enabled,false);
assert.deepEqual(policy.comparison_gate,{minimum_effective_visits_per_content:30,minimum_comparable_content_items:2,track_human_hours:true,missing_is_zero:false});
assert.deepEqual(policy.active_channels.map(x=>x.id),['search','youtube','x','community','developer_launch']);
assert.equal(policy.active_channels.reduce((sum,x)=>sum+x.time_share_percent,0),100);
for(const channel of policy.active_channels) {
  assert.deepEqual(Object.keys(channel).sort(),['automatic_external_action','cadence_28d','delivery','id','priority','role','time_share_percent','utm'].sort());
  assert.equal(channel.automatic_external_action,false);
  assert.ok(Number.isSafeInteger(channel.cadence_28d)&&channel.cadence_28d>0);
  assert.ok(Number.isSafeInteger(channel.time_share_percent)&&channel.time_share_percent>0);
}
assert.equal(policy.active_channels.find(x=>x.id==='search').utm,null);
assert.deepEqual(policy.active_channels.find(x=>x.id==='x').utm,{source:'x',medium:'social'});
assert.deepEqual(policy.active_channels.find(x=>x.id==='youtube').utm,{source:'youtube',medium:'video'});
assert.deepEqual(policy.active_channels.find(x=>x.id==='community').utm,{source:'reddit',medium:'community'});
assert.deepEqual(policy.deferred_channels.map(x=>x.id),['telegram','discord','newsletter']);
for(const channel of policy.deferred_channels) {
  assert.equal(channel.status,'deferred');assert.equal(channel.activation_gates.owner_approval_required,true);
  assert.ok(channel.activation_gates.documented_recurring_questions_28d>=10);
}
console.log('[OK] Channel policy: free-only portfolio, 28-day workload, no automatic external actions, sample gate and deferred retention channels.');
