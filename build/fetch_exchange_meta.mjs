#!/usr/bin/env node
/**
 * fetch_exchange_meta.mjs — 自动校准交易所「快变」元数据（P3 数据刷新）
 * =========================================================
 * 从 CoinGecko 自动拉取 7 家交易所的「会变化的」字段，写回 data/exchanges.js：
 *   - coins   → CoinGecko /exchanges/{id} 的 coins（有活跃现货市场的币种数，统一口径）
 *   - volume  → trade_volume_24h_btc × BTC 价，换算 USD，格式 "≈$X.XXB"
 *   - trust   → trust_score（10 分制）
 *   - market_data_retrieved_at → 成功拉取字段的时间；不更改人工费率复核日期
 *
 * 只更新行情字段及其获取时间，绝不覆盖人工核实的编辑字段
 * （reserve / cold / licenses / security / incident / max_leverage / has_options 等）。
 *
 * 用法：
 *   node build/fetch_exchange_meta.mjs          # 正常拉取
 *   node build/fetch_exchange_meta.mjs --dry    # 只打印，不写回
 *
 * 依赖：pro-api.coingecko.com 网络访问；COINGECKO_API_KEY 可选（降 429 限流）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const exPath = path.join(root, 'data', 'exchanges.js');

const CG = 'https://pro-api.coingecko.com/api/v3';
const DRY = process.argv.includes('--dry');

// CoinGecko 详情接口 id → 本站 slug（详情接口返回 coins/pairs/trust/volume）
const CG_TO_SLUG = {
  kucoin: 'kucoin',
  binance: 'binance',
  okex: 'okx',
  bybit_spot: 'bybit',
  bitget: 'bitget',
  kraken: 'kraken',
  gdax: 'coinbase'
};

const API_KEY = process.env.COINGECKO_API_KEY || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cgGet(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const headers = { accept: 'application/json' };
      if (API_KEY) headers['x-cg-pro-api-key'] = API_KEY;
      const res = await fetch(url, { headers });
      if (res.status === 429) {
        console.warn(`  ⚠️ 429 rate limit, waiting ${15 * (t + 1)}s...`);
        await sleep(15000 * (t + 1));
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

// USD 金额 → "X.XXB" 字符串（去掉尾随 0）
function fmtB(usd) {
  return ((usd / 1e9).toFixed(2).replace(/\.?0+$/, '') || '0') + 'B';
}

// Pure update boundary: no network and no changes to fee evidence or last_updated.
export function updateExchangeMetadata(src, slug, detail, btcUsd, retrievedAt) {
  if (!/^[a-z]+$/.test(slug) || !Number.isFinite(Date.parse(retrievedAt))) throw new Error('Invalid metadata identity/time');
  if (!Number.isSafeInteger(detail?.coins) || detail.coins <= 0 ||
      !Number.isInteger(detail?.trust_score) || detail.trust_score < 0 || detail.trust_score > 10) return src;
  const marker = 'window.EXCHANGE_COMPARE = ';
  const offset = src.indexOf(marker);
  if (offset < 0) throw new Error('Missing EXCHANGE_COMPARE');
  const prefix = src.slice(0, offset), tail = src.slice(offset);
  const re = new RegExp('("' + slug + '": \\{\\n)([^\\n]*)(\\n)');
  let matched = false;
  const updated = tail.replace(re, (_m, head, line, end) => {
    matched = true;
    const vol = detail.trade_volume_24h_btc;
    const validVol = Number.isFinite(vol) && vol >= 0 && Number.isFinite(btcUsd) && btcUsd > 0 && Number.isFinite(vol * btcUsd);
    const fields = { coins: detail.coins, trust: detail.trust_score };
    if (validVol) fields.volume = '≈$' + fmtB(vol * btcUsd);
    for (const [key,value] of Object.entries(fields)) {
      const field = new RegExp('("' + key + '": )("[^"]*"|[0-9.]+)');
      if (!field.test(line)) throw new Error('Missing metadata field: ' + slug + '.' + key);
      line = line.replace(field, (_m, lead) => lead + JSON.stringify(value));
    }
    const stamp = /, "market_data_retrieved_at": (\{[^}]*\})/;
    const previous = line.match(stamp);
    const times = previous ? JSON.parse(previous[1]) : {};
    for (const key of Object.keys(fields)) times[key] = retrievedAt;
    line = line.replace(stamp, '').replace(/,?$/, '') + ', "market_data_retrieved_at": ' + JSON.stringify(times) + ',';
    return head + line + end;
  });
  if (!matched) throw new Error('Missing metadata record: ' + slug);
  return prefix + updated;
}

async function main() {
  // 1. 拉 BTC 价格（换算 volume 用）
  let btcUsd = 0;
  try {
    const price = await cgGet(`${CG}/simple/price?ids=bitcoin&vs_currencies=usd`);
    btcUsd = price?.bitcoin?.usd || 0;
    console.log(`BTC price: $${btcUsd}`);
  } catch (e) {
    console.error(`⚠️ BTC price fetch failed: ${e.message} — 将跳过 volume 换算`);
  }

  // 2. 读 exchanges.js
  let src = fs.readFileSync(exPath, 'utf8');
  const orig = src;

  // 3. 逐家拉详情，替换 coins/volume/trust
  for (const [cgId, slug] of Object.entries(CG_TO_SLUG)) {
    let detail;
    try {
      detail = await cgGet(`${CG}/exchanges/${cgId}`);
      await sleep(1200); // 礼貌限速
    } catch (e) {
      console.warn(`  ⚠️ ${slug} (${cgId}) fetch failed: ${e.message} — 保持原值`);
      continue;
    }

    if (!detail) {
      console.warn('Skipping ' + slug + ': no response');
      continue;
    }
    const next = updateExchangeMetadata(src, slug, detail, btcUsd, new Date().toISOString());
    if (next === src) console.warn('Skipping ' + slug + ': invalid metadata');
    else console.log('Updated market metadata only: ' + slug);
    src = next;
  }

  if (src === orig) {
    console.log('无变化，不写回');
    return;
  }

  if (DRY) {
    console.log('[dry-run] 以上为将要写入的变更（未实际写回）');
    return;
  }

  fs.writeFileSync(exPath, src, 'utf8');
  console.log('已写回 data/exchanges.js');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((e) => {
  console.error('❌ fetch_exchange_meta 失败:', e.message);
  process.exit(1);
});
