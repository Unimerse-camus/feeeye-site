#!/usr/bin/env node
/**
 * fetch_coins.mjs — CoinGecko 摄取管线（P3 数据刷新）
 * =========================================================
 * 目标：从 CoinGecko 拉取「真实」币种快照，写入 data/coins.json，
 *       供 generate.mjs 程序化生成 /where-to-buy/[coin] 等页面。
 *
 * 两层数据：
 *   1) markets：币价 / 市值 / 排名（1 次批量请求，per_page=250）
 *   2) tickers：逐币上币覆盖（每币 1 次请求，匹配我们的 7 个交易所 slug）
 *
 * 用法：
 *   node build/fetch_coins.mjs                 # Top 250 + 真实 coverage（≤150 币时抓 tickers）
 *   node build/fetch_coins.mjs --top 100       # 只取前 100
 *   node build/fetch_coins.mjs --no-coverage   # 不抓 tickers，用离线启发式覆盖
 *   node build/fetch_coins.mjs --force         # 忽略缓存强制刷新
 *
 * 注意：本脚本需要能访问 api.coingecko.com 的网络（在你的主机/服务器上运行）。
 *       沙箱若无法访问，会自动回退到「离线启发式覆盖」并给出警告，
 *       此时 coins.json 的 exchanges 字段为「指示性」，页面会标注需核实。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'data', 'coins.json');

const CG = 'https://api.coingecko.com/api/v3';

// CoinGecko 交易所 id → 本站交易所 slug
// 注意：CoinGecko 用的是历史 identifier（OKX 在 CG 里叫 'okex'，Bybit spot 叫 'bybit_spot'）
const CG_TO_SLUG = {
  kucoin: 'kucoin',
  binance: 'binance',
  okex: 'okx',
  bybit_spot: 'bybit',
  bitget: 'bitget',
  kraken: 'kraken',
  gdax: 'coinbase'
};
const OUR_SLUGS = Object.values(CG_TO_SLUG);

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const TOP = parseInt(getArg('--top', '250'), 10);
const NO_COVERAGE = args.includes('--no-coverage');
const FORCE = args.includes('--force');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CoinGecko API key（GitHub Actions 从 Secret COINGECKO_API_KEY 注入；本地留空则匿名）
const API_KEY = process.env.COINGECKO_API_KEY || '';

async function cgGet(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const headers = { 'accept': 'application/json' };
      if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY;
      const res = await fetch(url, { headers });
      if (res.status === 429) {
        const wait = 15000 * (t + 1);
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

// ---- 离线启发式覆盖（无网络时的回退，标记为指示性）----
// 依据：alt 友好所（kucoin/bybit/okx/bitget）覆盖极广；binance 也很广；
//       coinbase/kraken 偏严格，仅头部且排除个别（BNB/TRX 等不上 Coinbase）。
function heuristicCoverage(rank, symbol) {
  const set = new Set();
  if (rank <= 250) ['kucoin', 'bybit', 'okx', 'bitget'].forEach((s) => set.add(s));
  if (rank <= 150) set.add('binance');
  if (rank <= 40) {
    set.add('coinbase');
    set.add('kraken');
  }
  // 已知排除
  if (symbol === 'BNB') { set.delete('coinbase'); set.delete('kraken'); }
  if (symbol === 'TRX') { set.delete('coinbase'); }
  return [...set];
}

async function main() {
  console.log(`🔄 Fetching top ${TOP} coins from CoinGecko...`);
  const markets = [];
  for (let page = 1; markets.length < TOP; page++) {
    const per = Math.min(250, TOP - markets.length);
    const url = `${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per}&page=${page}&sparkline=false`;
    const batch = await cgGet(url);
    if (!Array.isArray(batch) || batch.length === 0) break;
    markets.push(...batch);
    if (batch.length < per) break;
    await sleep(2000);
  }
  console.log(`  ✓ got ${markets.length} coins`);

  const coins = [];
  let online = true;
  const doCoverage = !NO_COVERAGE && markets.length <= 150;

  for (const m of markets) {
    const sym = m.symbol.toUpperCase();
    let exchanges;
    if (doCoverage && online) {
      try {
        const t = await cgGet(`${CG}/coins/${m.id}/tickers?depth=false`);
        const ids = new Set((t.tickers || []).map((x) => x.market && x.market.identifier).filter(Boolean));
        if (m.id === 'bitcoin') {
          console.log(`  🔍 DEBUG BTC: tickers.length=${(t.tickers || []).length} ids.size=${ids.size} sample=[${Array.from(ids).slice(0, 5).join(', ')}] has(kucoin)=${ids.has('kucoin')} has(okex)=${ids.has('okex')} has(bybit_spot)=${ids.has('bybit_spot')}`);
        }
        exchanges = OUR_SLUGS.filter((s) => ids.has(Object.keys(CG_TO_SLUG).find((k) => CG_TO_SLUG[k] === s)));
        await sleep(2000); // 礼貌限速
      } catch (e) {
        console.warn(`  ⚠️ ticker fetch failed for ${sym} (${e.message}); switching to offline heuristic.`);
        online = false;
        exchanges = heuristicCoverage(m.market_cap_rank, sym);
      }
    } else {
      exchanges = heuristicCoverage(m.market_cap_rank, sym);
    }
    coins.push({
      cg_id: m.id,
      symbol: sym,
      name: m.name,
      rank: m.market_cap_rank,
      price: m.current_price,
      market_cap: m.market_cap,
      exchanges,
      networks: [],
      last_updated: new Date().toISOString().slice(0, 10),
      coverage_source: online && doCoverage ? 'coingecko' : 'heuristic'
    });
  }

  const meta = {
    source: 'CoinGecko',
    generated_at: new Date().toISOString(),
    top: TOP,
    coverage_mode: doCoverage && online ? 'coingecko-tickers' : 'heuristic',
    note: doCoverage && online
      ? 'Exchange coverage verified via CoinGecko tickers.'
      : 'Exchange coverage is INDICATIVE (rank-based heuristic). Verify on each exchange before relying on it.'
  };
  fs.writeFileSync(outPath, JSON.stringify({ meta, coins }, null, 2));
  console.log(`✅ Wrote ${coins.length} coins → data/coins.json`);
  console.log(`   coverage_mode=${meta.coverage_mode}`);
  const kc = coins.filter((c) => c.exchanges.includes('kucoin')).length;
  console.log(`   kuCoin-listed: ${kc}/${coins.length}`);
}

main().catch((e) => {
  console.error('❌ fetch_coins failed:', e.message);
  process.exit(1);
});
