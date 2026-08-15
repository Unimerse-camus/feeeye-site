#!/usr/bin/env node
/**
 * fetch_security.mjs — GoPlus Security API 摄取管线
 * ===========================================================
 * 目标：按 data/coins.json 中各币的 ERC20 合约地址（eth 主网），
 *       拉取 GoPlus 安全检查数据，存到 data/security.json，
 *       供 generate.mjs 在 /where-to-buy/[coin] 渲染"安全检查"区块。
 *
 * 用法：node build/fetch_security.mjs
 * 注：本脚本走 fetch 调外部 API；沙箱若无法访问 gopluslabs.io，
 *     会自动跳过；CI 上正常跑。
 *
 * 免费层：30k CU/天 / 150 CU/分（单次请求 1 CU），124 币完全够用，
 * 不需要 API key。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const coinsJsonPath = path.join(root, 'data', 'coins.json');
const outPath = path.join(root, 'data', 'security.json');

const GP = 'https://api.gopluslabs.io/api/v1';
const ETH_CHAIN_ID = 1;  // 仅 ETH 主网（最大覆盖；其它链按需扩展）

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gpGet(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = 10000 * (t + 1);
        console.warn(`  ⚠️ 429 rate limit, waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(2000 * (t + 1));
    }
  }
}

// GoPlus 字段解析（部分字段返回 '0'/'1' 字符串，部分返回 0/1，统一归一化）
function b(v) { return v === '1' || v === 1 || v === true; }
function pct(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

// 浓缩为 6 个对新手小白最直白的安全指标（按"做产品不要自嗨"原则）
// 1. honeypot（貔貅盘）
// 2. buy_tax / 3. sell_tax（买卖税）
// 4. owner_renounced（owner 权限是否放弃）
// 5. is_mintable（是否可增发）
// 6. trust_list（是否 GoPlus 已验证）
// + holder_count（持币地址数，辅助判断深度）
function normalize(d) {
  const canTakeBack = b(d.can_take_back_ownership);
  const hasOwner = d.owner_address && d.owner_address !== '' && d.owner_address !== '0x0000000000000000000000000000000000000000';
  return {
    is_honeypot: b(d.is_honeypot),
    buy_tax: pct(d.buy_tax),
    sell_tax: pct(d.sell_tax),
    transfer_tax: pct(d.transfer_tax),
    is_open_source: b(d.is_open_source),
    is_proxy: b(d.is_proxy),
    is_mintable: b(d.is_mintable),
    owner_renounced: !canTakeBack && !hasOwner,
    trust_list: b(d.trust_list),
    holder_count: parseInt(d.holder_count) || 0,
    cannot_buy: b(d.cannot_buy),
    cannot_sell_all: b(d.cannot_sell_all),
    transfer_pausable: b(d.transfer_pausable),
    is_blacklisted: b(d.is_blacklisted),
    slippage_modifiable: b(d.slippage_modifiable)
  };
}

async function main() {
  console.log('🔄 Fetching GoPlus Security API for ERC20 tokens...');
  if (!fs.existsSync(coinsJsonPath)) {
    throw new Error('data/coins.json not found — run build/fetch_coins.mjs first');
  }
  const cj = JSON.parse(fs.readFileSync(coinsJsonPath, 'utf8'));
  const coins = cj.coins;

  const out = {
    meta: {
      source: 'GoPlus Security API',
      generated_at: new Date().toISOString(),
      chain: 'ethereum-mainnet',
      note: 'ETH mainnet only. Native chain coins (no ERC20 contract) are marked not_applicable. This is a snapshot — not a substitute for your own research.'
    },
    tokens: {}
  };

  let ok = 0, skip = 0, fail = 0;
  for (const c of coins) {
    const ethAddr = (c.platforms && c.platforms.ethereum) || '';
    if (!ethAddr || ethAddr === '' || ethAddr === '-') {
      out.tokens[c.symbol] = { status: 'not_applicable', reason: 'Native chain coin (no ERC20 contract)' };
      skip++;
      continue;
    }
    try {
      const url = `${GP}/token_security/${ETH_CHAIN_ID}?contract_addresses=${ethAddr}`;
      const r = await gpGet(url);
      const d = r.result && (r.result[ethAddr.toLowerCase()] || r.result[ethAddr]);
      if (!d || Object.keys(d).length === 0) {
        out.tokens[c.symbol] = { status: 'not_found', contract: ethAddr };
        skip++;
      } else {
        out.tokens[c.symbol] = {
          status: 'ok',
          contract: ethAddr,
          token_name: d.token_name || '',
          token_symbol: d.token_symbol || '',
          ...normalize(d)
        };
        ok++;
      }
      // 礼貌限速：≈4 req/sec，远低于 150 CU/min 限额
      await sleep(400);
    } catch (e) {
      console.warn(`  ⚠️ ${c.symbol} (${ethAddr}) fetch failed: ${e.message}`);
      out.tokens[c.symbol] = { status: 'error', contract: ethAddr, error: e.message };
      fail++;
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`✅ Wrote ${coins.length} entries → data/security.json (ok=${ok}, skip=${skip}, fail=${fail})`);
}

main().catch((e) => {
  console.error('❌ fetch_security failed:', e.message);
  process.exit(1);
});