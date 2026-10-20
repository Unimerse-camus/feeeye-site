#!/usr/bin/env node
// 账本读取助手(供 weekly_review 与 content_lifecycle_review 共用,避免循环依赖)。
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './ops_util.mjs';
import { readEncryptedJson } from './private_data_crypto.mjs';

// 取某目录下按日期命名的最新加密回执(search/gsc、analytics/cloudflare 等)。
export function latestDatedReceipt(store, folder, key) {
  const dir = path.join(path.resolve(store), ...folder.split('/'));
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(name => /^\d{4}-\d{2}-\d{2}\.json\.enc$/.test(name)).sort();
  return files.length ? readEncryptedJson(path.join(dir, files.at(-1)), key) : null;
}

// 读取全部 X 发布回执(明文幂等回执,即 X 渠道的天然登记表)。
export function loadXReceipts(store) {
  const dir = path.join(path.resolve(store), 'x');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => {
    const receipt = readJson(path.join(dir, name));
    if (receipt?.schema_version !== 1 || typeof receipt.recorded_at !== 'string' || typeof receipt.post_created !== 'boolean') throw new Error('Invalid X publish receipt');
    return receipt;
  });
}
