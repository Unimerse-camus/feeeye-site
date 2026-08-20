#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/exchanges.js'), 'utf8'), ctx, { filename: 'exchanges.js' });

const quote = ctx.window.getUsdtWithdrawalQuote;
assert.equal(quote('binance', 'TRC20', 1000).total, 1);
assert.equal(quote('coinbase', 'ERC20', 1000), null);
assert.equal(quote('coinbase', 'Polygon', 1000), null);
assert.equal(quote('missing', 'TRC20', 1000), null);
ctx.window.EXCHANGES.__model_test = {
  withdrawal_fees: { TEST: { amount: 3, model: 'dynamic_snapshot' } },
  withdrawal_processing: { rate: 0.0001, cap: 20, model: 'percentage_with_cap' },
  evidence: { withdrawal_fees: { url: 'https://example.com', checked_at: '2026-08-20' } }
};
assert.equal(quote('__model_test', 'TEST', 1000).total, 3.1);
assert.equal(quote('__model_test', 'TEST', 1_000_000).total, 23);
delete ctx.window.EXCHANGES.__model_test;

console.log('[test] withdrawal quote models passed');
