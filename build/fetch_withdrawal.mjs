#!/usr/bin/env node
/**
 * fetch_withdrawal.mjs — 拉取「每币 × 每所」的提币链 + 提币费（原币计价）
 * =========================================================
 * 目标：从各交易所公开/只读接口拉取每个币在每个交易所支持的提币链及其提币费，
 *       写入 data/withdrawal.json，供 generate.mjs 渲染币种页的「提币费」下拉列。
 *
 * 数据源（提币费均为原币数量，不做 USD 换算）：
 *   - KuCoin  : GET /api/v1/currencies/{symbol}        公开，逐币
 *   - OKX     : GET /api/v5/asset/currencies            公开，一次全量
 *   - Bybit   : GET /v5/asset/coin/query-info?coin=X   公开，逐币
 *   - Bitget  : GET /api/v2/spot/public/coins           公开，一次全量
 *   - Binance : GET /sapi/v1/capital/config/getall      需只读 API key + HMAC 签名，一次全量
 *   - Kraken / Coinbase：提币费为动态网络费（无固定值），本脚本不收录（页面显示 —）
 *
 * 用法：
 *   node build/fetch_withdrawal.mjs           # 正常拉取
 *   node build/fetch_withdrawal.mjs --dry     # 只打印统计，不写文件
 *
 * 环境变量：
 *   BINANCE_API_KEY / BINANCE_SECRET          # Binance 只读 key（可选；缺省跳过 Binance）
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const coinsPath = path.join(dataDir, 'coins.json');
const outPath = path.join(dataDir, 'withdrawal.json');

const DRY = process.argv.includes('--dry');
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || '';
const BINANCE_SECRET = process.env.BINANCE_SECRET || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, headers = {}, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json', ...headers } });
      if (res.status === 429) { await sleep(10000 * (t + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (t === tries - 1) throw e;
      await sleep(1500 * (t + 1));
    }
  }
}

function toNum(s) {
  if (s == null || s === '') return null;
  const n = Number(String(s));
  return Number.isFinite(n) ? n : null;
}

// ---- 各交易所拉取器：返回 symbol -> chains[]，或单币 chains[] ----

async function fetchKucoin(symbol) {
  const d = await getJson(`https://api.kucoin.com/api/v1/currencies/${symbol}`);
  if (d?.code !== '200000' || !d.data) return [];
  return (d.data.chains || [])
    .filter((c) => c.isWithdrawEnabled !== false)
    .map((c) => {
      const pct = toNum(c.withdrawFeeRate) || 0;
      const fee = pct ? null : (toNum(c.withdrawalMinFee) ?? toNum(c.withdrawFee));
      return { chain: c.chainName || c.chain, fee, pct: pct || null, min: toNum(c.withdrawalMinSize) };
    })
    .filter((x) => x.fee != null || x.pct != null);
}

async function fetchOkx() {
  const d = await getJson('https://www.okx.com/api/v5/asset/currencies');
  if (d?.code !== '0' || !Array.isArray(d.data)) return {};
  const map = {};
  for (const it of d.data) {
    const sym = (it.ccy || '').toUpperCase();
    if (!sym || it.canWd === false) continue;
    const fee = toNum(it.minFee);
    if (fee == null) continue;
    (map[sym] = map[sym] || []).push({ chain: it.chain || '', fee });
  }
  return map;
}

async function fetchBybit(symbol) {
  const d = await getJson(`https://api.bybit.com/v5/asset/coin/query-info?coin=${symbol}`);
  const rows = d?.result?.rows || d?.result?.list || [];
  const chains = (rows[0] && rows[0].chains) || [];
  return chains
    .filter((c) => c.chainWithdraw === '1' || c.chainWithdraw === 1)
    .map((c) => {
      const pct = toNum(c.withdrawPercentageFee) || 0;
      const fee = pct ? null : toNum(c.withdrawFee);
      return { chain: c.chainType || c.chain, fee, pct: pct || null, min: toNum(c.withdrawMin) };
    })
    .filter((x) => x.fee != null || x.pct != null);
}

async function fetchBitget() {
  const d = await getJson('https://api.bitget.com/api/v2/spot/public/coins');
  if (d?.code !== '00000' || !Array.isArray(d.data)) return {};
  const map = {};
  for (const it of d.data) {
    const sym = (it.coin || '').toUpperCase();
    if (!sym) continue;
    for (const c of it.chains || []) {
      if (c.withdrawable === 'false') continue;
      const fee = toNum(c.withdrawFee);
      if (fee == null) continue;
      (map[sym] = map[sym] || []).push({ chain: c.chain || '', fee, min: toNum(c.minWithdrawAmount) });
    }
  }
  return map;
}

async function fetchBinance() {
  if (!BINANCE_API_KEY || !BINANCE_SECRET) {
    console.warn('  ⚠️ 无 BINANCE_API_KEY/SECRET，跳过 Binance');
    return {};
  }
  const q = `timestamp=${Date.now()}&recvWindow=10000`;
  const sig = crypto.createHmac('sha256', BINANCE_SECRET).update(q).digest('hex');
  const d = await getJson(`https://api.binance.com/sapi/v1/capital/config/getall?${q}&signature=${sig}`, { 'X-MBX-APIKEY': BINANCE_API_KEY });
  if (!Array.isArray(d)) return {};
  const map = {};
  for (const it of d) {
    const sym = (it.coin || '').toUpperCase();
    if (!sym) continue;
    for (const n of it.networkList || []) {
      if (n.withdrawEnable === false) continue;
      const fee = toNum(n.withdrawFee);
      if (fee == null) continue;
      (map[sym] = map[sym] || []).push({ chain: n.network || '', fee, min: toNum(n.withdrawMin) });
    }
  }
  return map;
}

// 固定费按原币数值升序（最便宜在前），百分比费排最后
function sortChains(list) {
  return list.sort((a, b) => {
    if (a.fee == null && b.fee == null) return 0;
    if (a.fee == null) return 1;
    if (b.fee == null) return -1;
    return a.fee - b.fee;
  });
}

async function main() {
  const cj = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));
  const symbols = cj.coins.map((c) => c.symbol).filter(Boolean);
  console.log(`目标币种：${symbols.length} 个`);

  // 一次全量的所先拉
  let okxMap = {}, bitgetMap = {}, binanceMap = {};
  try { okxMap = await fetchOkx(); console.log(`  ✓ OKX ${Object.keys(okxMap).length} 币`); } catch (e) { console.warn(`  ⚠️ OKX 失败: ${e.message}`); }
  try { bitgetMap = await fetchBitget(); console.log(`  ✓ Bitget ${Object.keys(bitgetMap).length} 币`); } catch (e) { console.warn(`  ⚠️ Bitget 失败: ${e.message}`); }
  try { binanceMap = await fetchBinance(); console.log(`  ✓ Binance ${Object.keys(binanceMap).length} 币`); } catch (e) { console.warn(`  ⚠️ Binance 失败: ${e.message}`); }

  const coins = {};
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const entry = {};
    try { const l = await fetchKucoin(sym); if (l.length) entry.kucoin = sortChains(l); } catch (e) { /* 该所无此币或失败 */ }
    await sleep(250);
    try { const l = await fetchBybit(sym); if (l.length) entry.bybit = sortChains(l); } catch (e) { /* 同上 */ }
    await sleep(250);
    if (okxMap[sym]) entry.okx = sortChains(okxMap[sym]);
    if (bitgetMap[sym]) entry.bitget = sortChains(bitgetMap[sym]);
    if (binanceMap[sym]) entry.binance = sortChains(binanceMap[sym]);
    if (Object.keys(entry).length) coins[sym] = entry;
    if ((i + 1) % 20 === 0) console.log(`  进度 ${i + 1}/${symbols.length}`);
  }

  const covered = Object.keys(coins).length;
  console.log(`覆盖 ${covered}/${symbols.length} 币`);

  if (covered === 0) {
    console.error('❌ 0 币提币费数据，不写文件（避免清空已有数据）');
    process.exit(1);
  }

  const out = {
    meta: {
      generated_at: new Date().toISOString(),
      source: 'exchange public APIs (KuCoin/OKX/Bybit/Bitget/Binance)',
      note: 'fee/min 为原币数量；pct 为百分比费率；Kraken/Coinbase 动态费未收录'
    },
    coins
  };
  if (DRY) { console.log('[dry-run] 未写文件'); return; }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`✅ 写入 data/withdrawal.json（${covered} 币）`);
}

main().catch((e) => {
  console.error('❌ fetch_withdrawal 失败:', e.message);
  process.exit(1);
});
