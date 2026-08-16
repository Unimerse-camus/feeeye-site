#!/usr/bin/env node
/**
 * fetch_exchange_meta.mjs — 自动校准交易所「快变」元数据（P3 数据刷新）
 * =========================================================
 * 从 CoinGecko 自动拉取 7 家交易所的「会变化的」字段，写回 data/exchanges.js：
 *   - coins   → CoinGecko /exchanges/{id} 的 coins（有活跃现货市场的币种数，统一口径）
 *   - volume  → trade_volume_24h_btc × BTC 价，换算 USD，格式 "≈$X.XXB"
 *   - trust   → trust_score（10 分制）
 *
 * 只更新这三个字段，绝不覆盖人工核实的编辑字段
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
import { fileURLToPath } from 'node:url';

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
  return (usd / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
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

    const coins = detail?.coins;
    const trust = detail?.trust_score;
    const volBtc = detail?.trade_volume_24h_btc;
    if (coins == null || trust == null) {
      console.warn(`  ⚠️ ${slug} 缺 coins/trust (coins=${coins} trust=${trust}) — 跳过`);
      continue;
    }

    // volume 仅在 BTC 价可用且 volBtc 有效时更新；否则保持原值
    const newVol = (btcUsd && volBtc != null) ? `≈$${fmtB(volBtc * btcUsd)}` : null;

    // 精确替换该 slug 在 EXCHANGE_COMPARE 里的 "coins": N, "volume": "...", "trust": N
    // 锚定 "slug": { 后第一行（含 max_leverage ... security）
    // 捕获组：p1=前缀, p2=原coins, p3=volume前缀, p4=原volume, p5=trust前缀, p6=原trust
    // 用「函数替换」而非「字符串替换」：newVol 含 "$" 符号，字符串替换会把 "$1" 误解析为捕获组
    const re = new RegExp(
      `("${slug}": \\{\\n    "max_leverage"[^\\n]*?"coins": )(\\d+)(, "volume": ")("[^"]*)(", "trust": )(\\d+)`
    );
    const next = src.replace(re, (_m, p1, _oldCoins, p3, oldVol, p5, _oldTrust) => {
      const vol = newVol != null ? newVol : oldVol;
      return `${p1}${coins}${p3}${vol}${p5}${trust}`;
    });
    if (next === src) {
      console.warn(`  ⚠️ ${slug} 正则未匹配（格式可能已变），保持原值`);
      continue;
    }
    src = next;
    console.log(`  ✓ ${slug}: coins=${coins}, volume=${newVol || '保持原值'}, trust=${trust}`);
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

main().catch((e) => {
  console.error('❌ fetch_exchange_meta 失败:', e.message);
  process.exit(1);
});
