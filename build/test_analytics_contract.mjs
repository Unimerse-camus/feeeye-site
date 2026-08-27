#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets', 'analytics.js'), 'utf8');
const captured = [];
const window = { zaraz: { track: (name, payload) => captured.push({ name, payload }) } };
const document = {
  documentElement: { lang: 'zh-CN' },
  addEventListener: () => {}
};
const location = {
  pathname: '/zh/learn/safe-crypto-transfer.html',
  search: '?utm_source=X%20Spam!&utm_medium=social&utm_campaign=Safe%20Transfer%E4%B8%AD%E6%96%87'
};
const context = { window, document, location, URLSearchParams, Promise, Object, String, Number, Math, RegExp };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'analytics.js' });

const api = window.FeeEyeAnalytics;
if (!api || typeof api.track !== 'function') throw new Error('FeeEyeAnalytics.track is unavailable');
api.track('coin_search_no_result', { query_length: 12, query: 'secret query', amount: 999, wallet: '0xsecret' });
api.track('unknown_event', { query: 'secret query' });
api.track('learn_quiz_open', { article_id: 'Safe Transfer!', question_number: 2, answer: 'secret' });
api.track('research_tool_open', { benchmark_id: '1000 USDT Spot Cost!', tool: 'total-cost-calculator', amount: 1000 });

if (captured.length !== 3) throw new Error(`Expected 3 allowed events, received ${captured.length}`);
const search = captured[0];
if (search.name !== 'coin_search_no_result') throw new Error('Unexpected first event');
if (search.payload.query_length !== 12) throw new Error('query_length missing');
for (const forbidden of ['query', 'amount', 'wallet', 'email', 'user_id']) {
  if (Object.prototype.hasOwnProperty.call(search.payload, forbidden)) throw new Error(`Forbidden field leaked: ${forbidden}`);
}
if (search.payload.utm_source !== 'xspam' || search.payload.utm_medium !== 'social' || search.payload.utm_campaign !== 'safetransfer') {
  throw new Error(`UTM sanitization failed: ${JSON.stringify(search.payload)}`);
}
const quiz = captured[1];
if (quiz.payload.article_id !== 'safetransfer' || quiz.payload.question_number !== 2 || quiz.payload.answer != null) {
  throw new Error(`Quiz payload contract failed: ${JSON.stringify(quiz.payload)}`);
}
const research = captured[2];
if (research.payload.benchmark_id !== '1000usdtspotcost' || research.payload.tool !== 'total-cost-calculator' || research.payload.amount != null) {
  throw new Error(`Research payload contract failed: ${JSON.stringify(research.payload)}`);
}

console.log('[OK] Analytics contract passed: whitelist, forbidden fields, and UTM sanitization.');
