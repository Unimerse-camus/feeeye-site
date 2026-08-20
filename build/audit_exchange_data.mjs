#!/usr/bin/env node
/**
 * Audit the data contract used by all exchange detail and pair-comparison pages.
 * This checks consistency and freshness metadata; it does not replace checking
 * volatile fees and regulatory claims against each exchange's official pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { validateExchangeData } from './exchange_data_validation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/exchanges.js'), 'utf8'), ctx, { filename: 'exchanges.js' });

const exchanges = ctx.window.EXCHANGES || {};
const compare = ctx.window.EXCHANGE_COMPARE || {};
const { errors, warnings, exchanges: exchangeCount, pairs, today } = validateExchangeData(exchanges, compare);

console.log(`[audit] exchanges=${exchangeCount} pairs=${pairs} snapshot=${today}`);
for (const warning of warnings) console.warn(`[warning] ${warning}`);
for (const error of errors) console.error(`[error] ${error}`);
console.log(`[audit] errors=${errors.length} warnings=${warnings.length}`);
if (errors.length) process.exitCode = 1;
