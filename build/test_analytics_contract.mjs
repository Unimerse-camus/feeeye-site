#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../assets/analytics.js',import.meta.url),'utf8');
const captured = [];
const window = {zaraz:{track:(name,payload)=>captured.push({name,payload})}};
const document = {documentElement:{lang:'zh-CN'},addEventListener:()=>{},querySelector:()=>null};
const location = {pathname:'/zh/learn/safe-crypto-transfer.html',search:'?utm_source=x&utm_medium=social&utm_campaign=1000-usdt-fee'};
vm.runInNewContext(source,{window,document,location,URLSearchParams,Promise,sessionStorage:{getItem:()=>null,setItem:()=>{}}});
const api=window.FeeEyeAnalytics;
api.track('coin_search_no_result',{query_length:12,query:'secret',amount:999,wallet:'0xsecret'});
assert.equal(captured.length,1);
assert.equal(captured[0].payload.utm_source,'x');
assert.equal(captured[0].payload.utm_campaign,'1000-usdt-fee');
assert.equal(captured[0].payload.query_length,12);
for(const forbidden of ['query','amount','wallet','email','user_id']) assert.equal(captured[0].payload[forbidden],undefined);
for(const query of [
  '?utm_source=X%20Spam!&utm_medium=social&utm_campaign=SafeTransfer',
  '?utm_source=alice@example.com&utm_medium=social&utm_campaign=1000-usdt-fee',
  '?utm_source=x&utm_medium=social&utm_campaign=alice-private',
  '?utm_source=x&utm_medium=email&utm_campaign=1000-usdt-fee',
  '?utm_source=x&utm_source=reddit&utm_medium=social&utm_campaign=1000-usdt-fee',
  '?utm_source=x&utm_medium=social&utm_campaign=1000-usdt-fee&utm_campaign=secret',
  '?utm_source=constructor&utm_medium=social&utm_campaign=1000-usdt-fee'
]) {
  location.search=query;
  api.track('coin_search_open');
  assert.ok(!Object.keys(captured.at(-1).payload).some(k=>k.startsWith('utm_')));
}
for(const [source,medium] of [['x','social'],['reddit','community'],['youtube','video']]) {
  location.search='?utm_source='+source+'&utm_medium='+medium+'&utm_campaign=1000-usdt-fee';
  api.track('research_tool_open',{benchmark_id:'1000-usdt-spot-cost',tool:'total-cost-calculator',amount:1000});
  assert.equal(captured.at(-1).payload.utm_source,source);
  assert.equal(captured.at(-1).payload.amount,undefined);
}
const n=captured.length;
for(const event of ['unknown_event','tool_use','learn_article_complete']) assert.equal(api.track(event,{}),false);
assert.equal(captured.length,n);
api.track('tool_interaction',{tool:'total-cost-calculator'});
api.track('article_end_view',{article_id:'safe-crypto-transfer'});
assert.equal(api.track('content_feedback',{article_id:'safe-crypto-transfer',sentiment:'helpful',reason:'none',comment:'private text',email:'a@example.com'}),true);
assert.equal(captured.at(-1).payload.comment,undefined);assert.equal(captured.at(-1).payload.email,undefined);assert.equal(captured.at(-1).payload.reason,'none');
assert.equal(api.track('content_feedback',{article_id:'safe-crypto-transfer',sentiment:'needs_improvement',reason:'unclear'}),true);
assert.equal(api.track('content_feedback',{article_id:'safe-crypto-transfer',sentiment:'needs_improvement',reason:'free text'}),false);
assert.equal(api.track('content_feedback',{article_id:'../../secret',sentiment:'helpful',reason:'none'}),false);
assert.equal(api.track('content_feedback',{article_id:'safe-crypto-transfer',sentiment:'helpful',reason:'unclear'}),false);
for(const article_id of ['before-you-start','avoid-crypto-scams','secure-crypto-account','choose-crypto-exchange','first-spot-trade','crypto-total-cost','safe-crypto-transfer','custody-vs-self-custody']) assert.equal(api.track('content_feedback',{article_id,sentiment:'helpful',reason:'none'}),true);
assert.equal(captured.length,n+12);
window.zaraz=null;
assert.equal(api.track('coin_search_open'),false);
window.zaraz={track:()=>{throw new Error('offline');}};
assert.equal(api.track('coin_search_open'),false);
window.zaraz={track:()=>Promise.reject(new Error('async offline'))};
assert.equal(api.track('coin_search_open'),true);
await new Promise(resolve=>setTimeout(resolve,0));
console.log('[OK] Analytics: registered UTM tuples, privacy fields, honest event names, missing/failing transport.');
