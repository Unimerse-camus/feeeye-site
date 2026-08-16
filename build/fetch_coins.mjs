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

// ---- 币种过滤（A1：去除稳定币 / RWA 代币基金 / 垃圾符号，只留真实 "where to buy" 意图的币）----
const STABLECOINS = new Set([
  'USDT','USDC','DAI','USDE','USDS','FDUSD','TUSD','PYUSD','GUSD','BUSD','LUSD','FRAX',
  'USTC','USDP','XUSD','USUAL','USD1','EURS','EURC','AEUR','AUSD','USDY','USDF','USDM',
  'USD0','USDX','MUSD','USDR','DOLA','CRVUSD','GHUSD','USDG','USDA','BUIDL','USDEB',
  'RLUSD','BFUSD','U','GHO','YLDS','USDTB','USDC.E'
]);
// RWA / 代币化基金 / 债类特征（name 关键词，宽匹配但避开正常币名）
const JUNK_NAME = /tokeniz|fund|etf|bond|treasury|heloc|credit|loan|receipt|claim token|collateralized debt|deposit note|stablecoin|stables|dollar|\busd\b/i;
const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.-]{0,11}$/; // ASCII、≤12 字符

function isJunkCoin(symbol, name) {
  if (STABLECOINS.has(symbol)) return true;
  if (symbol.startsWith('USD')) return true;       // USD 前缀 = 美元稳定币/包装稳定币（USDT/USDC/USDE/USDtb...）
  if (!SYMBOL_RE.test(symbol)) return true;          // 非 ASCII / 超长 / 非法字符
  if (/^[0-9]+$/.test(symbol)) return true;          // 纯数字符号
  if (JUNK_NAME.test(name)) return true;             // RWA / 基金 / 债类 / 稳定币名特征
  if (symbol.includes('USD') && /bridg|wrapped usd/i.test(name)) return true; // 桥接稳定币
  return false;
}

// 硬编码兜底白名单：市值排名可能 > Top 阈值、但搜索意图持久的币（meme/L2 生态）。
// 主信号是 /search/trending（自动捕获新热门币）；本清单兜底"掉出 trending 后仍是常青"的币。
// 新热门币应主要靠 trending 自动进入，而非手工加进这里。
const HOT_COINS = [
  { cg_id: 'dogwifcoin', symbol: 'WIF' },
  { cg_id: 'bonk', symbol: 'BONK' },
  { cg_id: 'optimism', symbol: 'OP' },
  { cg_id: 'floki', symbol: 'FLOKI' }
];

// 币种分类映射：CoinGecko 的 categories 是细粒度英文数组，映射成中性大类 key。
// 优先级从最具体到最泛；第一个命中的即为主分类，都不命中归 'other'。
// �️ L1/L2 必须在 DeFi 之前：CoinGecko 给几乎所有 L1 公链都打了
//    "Decentralized Finance (DeFi)" 子标签（因为 L1 是 DeFi 基础设施），
//    若 defi 规则在前，会把 BTC/ETH/SOL 全部误归到 defi。
const CATEGORY_PRIORITY = [
  // 稳定币：先匹配（最特定）
  { re: /stablecoin|fiat-backed|^usd$|wrapped.*usd/i, cat: 'stable' },
  // Meme（必须在 L1 之前：meme 币也常被打 "Layer 1 (L1)" / "Smart Contract Platform" 子标签）
  { re: /^meme$|^memecoin$|^dog coin ecosystem$/i, cat: 'meme' },
  // RWA / 代币化
  { re: /^rwa$|real world asset|tokenized asset/i, cat: 'rwa' },
  // 交易所平台币（必须在 L1 之前：平台币也常被打 "Smart Contract Platform"）
  { re: /exchange-based|^cex$|^centralized exchange$/i, cat: 'exchange' },
  // L1/L2 公链：严格只匹配主分类，避免宽匹配吞掉 meme/RWA/平台币
  // ⚠️ 不要加 "smart contract platform"/"store of value"/"ecosystem"/"pow"/"pos" 这些宽匹配
  //    —— CoinGecko 给几乎所有币都打了这些子标签，会把 meme/RWA/平台币全部误归 L1
  { re: /^l1$|^l2$|^layer 1$|^layer 2$|^smart contract platform$/i, cat: 'l1' },
  // DeFi（收紧：只匹配纯 DeFi 关键词）
  { re: /^defi$|^dex$|^decentralized exchange$|yield farming|^lending$|liquid staking|^amm$|automated market maker|^oracle$/i, cat: 'defi' }
];

function mapCategory(categories) {
  if (!Array.isArray(categories)) return 'other';
  for (const p of CATEGORY_PRIORITY) {
    if (categories.some((c) => p.re.test(c))) return p.cat;
  }
  return 'other';
}

// 硬编码纠正：CoinGecko 的次要标签会把个别币误分，这里按常识逐个纠偏。
// 键 = 大写 symbol，值 = 正确分类。优先级高于 CATEGORY_PRIORITY 规则。
const CATEGORY_OVERRIDE = {
  LINK: 'defi',   // Chainlink = 预言机 / DeFi 基础设施（不是 RWA）
  XLM: 'l1',      // Stellar = L1 公链（不是 RWA）
  UNI: 'defi',    // Uniswap = DEX（不是平台币）
  HYPE: 'defi',   // Hyperliquid = 去中心化衍生品 DEX（不是平台币）
  XMR: 'l1',      // Monero = 隐私币（PoW 公链）
  ZEC: 'l1'       // Zcash = 隐私币（PoW 公链）
};

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
  let skipped = 0;
  let online = true;
  const doCoverage = !NO_COVERAGE && markets.length <= 150;

  for (const m of markets) {
    const sym = m.symbol.toUpperCase();
    if (isJunkCoin(sym, m.name)) { skipped++; continue; }
    let exchanges;
    if (doCoverage && online) {
      try {
        const t = await cgGet(`${CG}/coins/${m.id}/tickers?depth=false`);
        const ids = new Set((t.tickers || []).map((x) => x.market && x.market.identifier).filter(Boolean));
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
    // 分类 + 合约地址（顺便用同一 endpoint 拿，零额外请求）
    let category = 'other';
    let platforms = {};
    if (online) {
      try {
        const d = await cgGet(`${CG}/coins/${m.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`);
        category = CATEGORY_OVERRIDE[sym] || mapCategory(d.categories || []);
        platforms = d.platforms || {};
        await sleep(1200);
      } catch (e) {
        /* categories / platforms 拉取失败，忽略 */
      }
    }
    coins.push({
      cg_id: m.id,
      symbol: sym,
      name: m.name,
      rank: m.market_cap_rank,
      price: m.current_price,
      market_cap: m.market_cap,
      change_24h: m.price_change_percentage_24h != null ? m.price_change_percentage_24h : null,
      exchanges,
      category,
      platforms,
      networks: [],
      last_updated: new Date().toISOString().slice(0, 10),
      coverage_source: online && doCoverage ? 'coingecko' : 'heuristic'
    });
  }

  // 补充"搜索意图"币：市值 Top N 之外但用户会搜的币
  //   1) 自动 trending（CoinGecko 7 天热搜）—— 捕获新崛起的热门币
  //   2) HOT_COINS 硬编码白名单 —— 兜底常青热门币（trending 掉出后仍在）
  const existingSyms = new Set(coins.map((c) => c.symbol));

  async function addCoin(cgId, source) {
    try {
      const m = await cgGet(`${CG}/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`);
      const sym = m.symbol.toUpperCase();
      if (existingSyms.has(sym)) return;
      if (isJunkCoin(sym, m.name)) { console.log(`  - skip junk ${sym} (${m.name})`); return; }
      let exchanges;
      if (doCoverage && online) {
        const t = await cgGet(`${CG}/coins/${cgId}/tickers?depth=false`);
        const ids = new Set((t.tickers || []).map((x) => x.market && x.market.identifier).filter(Boolean));
        exchanges = OUR_SLUGS.filter((s) => ids.has(Object.keys(CG_TO_SLUG).find((k) => CG_TO_SLUG[k] === s)));
        await sleep(2000);
      } else {
        exchanges = heuristicCoverage(m.market_data.market_cap_rank, sym);
      }
      coins.push({
        cg_id: cgId,
        symbol: sym,
        name: m.name,
        rank: m.market_data.market_cap_rank,
        price: m.market_data.current_price.usd,
        market_cap: m.market_data.market_cap.usd,
        change_24h: m.market_data.price_change_percentage_24h != null ? m.market_data.price_change_percentage_24h : null,
        exchanges,
        category: CATEGORY_OVERRIDE[sym] || mapCategory(m.categories || []),
        platforms: m.platforms || {},
        networks: [],
        last_updated: new Date().toISOString().slice(0, 10),
        coverage_source: online && doCoverage ? 'coingecko' : 'heuristic',
        [source]: true
      });
      existingSyms.add(sym);
      console.log(`  + ${source} ${sym} (rank ${m.market_data.market_cap_rank})`);
    } catch (e) {
      console.warn(`  ⚠️ ${source} ${cgId} fetch failed: ${e.message}`);
    }
  }

  // 1) 自动 trending（搜索意图主信号）
  let trendingIds = [];
  try {
    const tr = await cgGet(`${CG}/search/trending`);
    trendingIds = (tr.coins || []).map((x) => x.item && x.item.id).filter(Boolean);
    console.log(`  trending: ${trendingIds.length} coins`);
  } catch (e) {
    console.warn(`  ⚠️ trending fetch failed: ${e.message}`);
  }
  for (const id of trendingIds) {
    await addCoin(id, 'trending');
  }

  // 2) HOT_COINS 硬编码兜底
  for (const h of HOT_COINS) {
    await addCoin(h.cg_id, 'hotlist');
  }

  coins.sort((a, b) => a.rank - b.rank);

  const meta = {
    source: 'CoinGecko',
    generated_at: new Date().toISOString(),
    top: TOP,
    coverage_mode: doCoverage && online ? 'coingecko-tickers' : 'heuristic',
    note: doCoverage && online
      ? 'Exchange coverage verified via CoinGecko tickers.'
      : 'Exchange coverage is INDICATIVE (rank-based heuristic). Verify on each exchange before relying on it.',
    hot_strategy: 'market_cap_top_N ∪ /search/trending ∪ HOT_COINS (dedup, junk-filtered)',
    trending_count: coins.filter((c) => c.trending).length,
    hotlist_count: coins.filter((c) => c.hotlist).length
  };
  fs.writeFileSync(outPath, JSON.stringify({ meta, coins }, null, 2));
  console.log(`✅ Wrote ${coins.length} coins → data/coins.json (removed ${skipped} junk: stablecoins/RWA funds/bad symbols)`);
  console.log(`   coverage_mode=${meta.coverage_mode}`);
  const kc = coins.filter((c) => c.exchanges.includes('kucoin')).length;
  console.log(`   kuCoin-listed: ${kc}/${coins.length}`);
}

main().catch((e) => {
  console.error('❌ fetch_coins failed:', e.message);
  process.exit(1);
});
