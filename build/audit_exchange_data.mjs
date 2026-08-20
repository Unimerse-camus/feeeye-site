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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/exchanges.js'), 'utf8'), ctx, { filename: 'exchanges.js' });

const exchanges = ctx.window.EXCHANGES || {};
const compare = ctx.window.EXCHANGE_COMPARE || {};
const errors = [];
const warnings = [];
const today = new Date().toISOString().slice(0, 10);
const ageDays = (date) => Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
const isRate = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 0.1;

for (const [slug, ex] of Object.entries(exchanges)) {
  if (slug !== ex.slug) errors.push(`${slug}: slug field is ${ex.slug || 'missing'}`);
  if (!ex.name || !ex.official_url || !ex.source) errors.push(`${slug}: missing name, official_url or source`);
  if (!/^https:\/\//.test(ex.source || '')) warnings.push(`${slug}: source is not a single HTTPS URL`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ex.last_updated || '')) errors.push(`${slug}: invalid last_updated`);
  else if (ageDays(ex.last_updated) > 7) warnings.push(`${slug}: volatile fee snapshot is ${ageDays(ex.last_updated)} days old`);

  for (const [market, rates] of [['spot', ex.spot], ['futures', ex.futures]]) {
    if (!rates || !isRate(rates.maker) || !isRate(rates.taker)) errors.push(`${slug}: invalid ${market} maker/taker rate`);
  }

  const withdrawal = ex.usdt_withdrawal || {};
  if (!Object.keys(withdrawal).length) errors.push(`${slug}: no USDT withdrawal networks`);
  for (const [network, fee] of Object.entries(withdrawal)) {
    if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) errors.push(`${slug}: invalid ${network} withdrawal fee`);
    if (!(ex.supported_networks || []).includes(network)) warnings.push(`${slug}: ${network} has a withdrawal fee but is absent from supported_networks`);
  }
  if (ex.withdrawal_processing_rate != null) {
    if (!isRate(ex.withdrawal_processing_rate)) errors.push(`${slug}: invalid withdrawal_processing_rate`);
    if (typeof ex.withdrawal_processing_cap !== 'number' || ex.withdrawal_processing_cap <= 0) errors.push(`${slug}: processing fee needs a positive cap`);
  }
  for (const network of ex.supported_networks || []) {
    if (withdrawal[network] == null) warnings.push(`${slug}: ${network} is supported but has no withdrawal fee`);
  }

  if (!(ex.deposit_methods || []).length) warnings.push(`${slug}: no funding methods`);
  for (const method of ex.deposit_methods || []) {
    if (!method.m || typeof method.fee !== 'number' || method.fee < 0) errors.push(`${slug}: invalid funding method`);
    if (method.fee_max != null && method.fee_max < method.fee) errors.push(`${slug}: ${method.m} fee_max is below fee`);
  }

  const cd = compare[slug];
  if (!cd) {
    errors.push(`${slug}: missing EXCHANGE_COMPARE record`);
    continue;
  }
  for (const key of ['max_leverage', 'coins', 'trust']) if (cd[key] == null) errors.push(`${slug}: compare.${key} missing`);
  for (const key of ['kyc', 'licenses', 'reserve', 'incident']) {
    if (!cd[key]?.en || !cd[key]?.zh) errors.push(`${slug}: compare.${key} needs en and zh`);
  }
}

for (const slug of Object.keys(compare)) if (!exchanges[slug]) errors.push(`${slug}: orphan EXCHANGE_COMPARE record`);

const slugs = Object.keys(exchanges);
let pairs = 0;
for (let i = 0; i < slugs.length; i++) {
  for (let j = i + 1; j < slugs.length; j++) {
    pairs++;
    const a = exchanges[slugs[i]].usdt_withdrawal || {};
    const b = exchanges[slugs[j]].usdt_withdrawal || {};
    if (!Object.keys(a).some((network) => b[network] != null)) errors.push(`${slugs[i]} vs ${slugs[j]}: no common USDT withdrawal network`);
  }
}

console.log(`[audit] exchanges=${slugs.length} pairs=${pairs} snapshot=${today}`);
for (const warning of warnings) console.warn(`[warning] ${warning}`);
for (const error of errors) console.error(`[error] ${error}`);
console.log(`[audit] errors=${errors.length} warnings=${warnings.length}`);
if (errors.length) process.exitCode = 1;
