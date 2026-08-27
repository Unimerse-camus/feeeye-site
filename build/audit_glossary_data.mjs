#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ALLOWED_CATEGORIES = new Set(['basic', 'trading', 'defi', 'nft', 'wallet', 'security', 'chain', 'common']);
const ALLOWED_RISKS = new Set(['standard', 'caution', 'high']);
const REQUIRED_LOCALES = ['zh', 'en'];
const REQUIRED_TEXT = ['term', 'def', 'ex'];
const UNSAFE_COPY = [
  /稳赚|保本|抄底机会|买入机会|新手友好策略/iu,
  /guaranteed returns?|buy(?:ing)? opportunity/iu,
  /do your own reminder/iu,
  /免\s*KYC|without\s+KYC/iu
];

export function loadGlossary(file) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return { data: context.window.GLOSSARY, meta: context.window.GLOSSARY_META };
}

export function validateGlossary(data, meta) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(data) || data.length === 0) return { errors: ['GLOSSARY must be a non-empty array'], warnings };
  if (!meta || typeof meta !== 'object') return { errors: ['GLOSSARY_META is required'], warnings };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.reviewed_at || '')) errors.push('GLOSSARY_META.reviewed_at must use YYYY-MM-DD');
  if (!meta.sources || typeof meta.sources !== 'object') errors.push('GLOSSARY_META.sources is required');

  for (const [key, source] of Object.entries(meta.sources || {})) {
    if (!source?.label) errors.push(`source ${key}: label is required`);
    if (!/^https:\/\//.test(source?.url || '')) errors.push(`source ${key}: HTTPS URL is required`);
  }

  const seen = new Set();
  for (const [index, item] of data.entries()) {
    const id = item?.key || `entry ${index + 1}`;
    if (!item?.key) errors.push(`entry ${index + 1}: key is required`);
    if (seen.has(item?.key)) errors.push(`${id}: duplicate key`);
    seen.add(item?.key);
    if (!ALLOWED_CATEGORIES.has(item?.cat)) errors.push(`${id}: invalid category ${item?.cat}`);
    if (!ALLOWED_RISKS.has(item?.risk_level)) errors.push(`${id}: invalid risk_level ${item?.risk_level}`);
    if (!Array.isArray(item?.source) || item.source.length === 0) errors.push(`${id}: at least one source is required`);
    for (const sourceKey of item?.source || []) {
      if (!meta.sources?.[sourceKey]) errors.push(`${id}: unknown source ${sourceKey}`);
    }
    for (const locale of REQUIRED_LOCALES) {
      for (const field of REQUIRED_TEXT) {
        if (typeof item?.[locale]?.[field] !== 'string' || !item[locale][field].trim()) errors.push(`${id}: ${locale}.${field} is required`);
      }
    }
    const copy = REQUIRED_LOCALES.flatMap((locale) => REQUIRED_TEXT.map((field) => item?.[locale]?.[field] || '')).join(' ');
    if (/\*\*/.test(copy)) errors.push(`${id}: Markdown emphasis is not supported in glossary cards`);
    for (const pattern of UNSAFE_COPY) if (pattern.test(copy)) errors.push(`${id}: contains prohibited promotional or bypass language (${pattern})`);
    if (item?.risk_level === 'standard' && /leverage|liquidat|seed phrase|private key|杠杆|强平|助记词|私钥/iu.test(copy)) {
      warnings.push(`${id}: consider caution/high risk_level`);
    }
  }
  if (data.length < 40) warnings.push(`glossary coverage dropped to ${data.length} entries`);
  return { errors, warnings };
}

export function auditGlossaryFile(file) {
  const { data, meta } = loadGlossary(file);
  return { ...validateGlossary(data, meta), count: Array.isArray(data) ? data.length : 0, reviewedAt: meta?.reviewed_at || '' };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = auditGlossaryFile(path.join(root, 'data', 'glossary.js'));
  for (const warning of result.warnings) console.warn(`[glossary warning] ${warning}`);
  if (result.errors.length) {
    console.error(`[FAIL] Glossary audit failed:\n${result.errors.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`[OK] Glossary audit passed: ${result.count} entries, reviewed ${result.reviewedAt}.`);
  }
}
