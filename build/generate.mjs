#!/usr/bin/env node
/**
 * generate.mjs — P3 程序化 SEO 静态生成器（零依赖）
 * =========================================================
 * 复用 data/exchanges.js + data/country_availability.js（vm 加载），
 * 币种优先读取 data/coins.json（CoinGecko 真实快照，覆盖用启发式或真实 tickers），
 * 回退到 data/coins.js（20 币种子）。产出标准静态 HTML：
 *   dist/index.html
 *   dist/where-to-buy/[coin].html      （每币一页，真实支持所对比 + 实时价格）
 *   dist/exchanges/[slug].html         （交易所详情）
 *   dist/compare/kucoin-vs-[x].html    （对比页）
 *   dist/[country]/exchanges.html      （国家页，仅非受限地区，合规友好）
 * 并拷贝 tools/ 与 data/ 进 dist，使站内交互计算器可用。
 *
 * 运行：node build/generate.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const distDir = path.join(root, 'dist');
const toolsDir = path.join(root, 'tools');

// ---- 加载数据（vm 注入 window 垫片）----
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ['exchanges.js', 'country_availability.js']) {
  vm.runInContext(fs.readFileSync(path.join(dataDir, f), 'utf8'), ctx, { filename: f });
}
const EX = ctx.window.EXCHANGES;
const CA = ctx.window.COUNTRY_AVAILABILITY;
const COUNTRY_NAMES = ctx.window.COUNTRY_NAMES || {};
const getFee = ctx.window.getUsdtWithdrawalFee;
const UPD = EX.kucoin.last_updated;
const KU = EX.kucoin;
const KU_LINK = KU.affiliate_link;
const RESTRICTED_LABEL = ['US', 'CN', 'HK', 'SG'].join(', ');

// ---- 币种：优先 coins.json，回退 coins.js ----
function heuristicCoverage(rank, symbol) {
  const set = new Set();
  if (rank <= 250) ['kucoin', 'bybit', 'okx', 'bitget'].forEach((s) => set.add(s));
  if (rank <= 150) set.add('binance');
  if (rank <= 40) { set.add('coinbase'); set.add('kraken'); }
  if (symbol === 'BNB') { set.delete('coinbase'); set.delete('kraken'); }
  if (symbol === 'TRX') { set.delete('coinbase'); }
  return [...set];
}

let COIN_LIST = [];
let COVERAGE_MODE = 'seed(coins.js)';
const coinJsonPath = path.join(dataDir, 'coins.json');
if (fs.existsSync(coinJsonPath)) {
  const cj = JSON.parse(fs.readFileSync(coinJsonPath, 'utf8'));
  COVERAGE_MODE = cj.meta.coverage_mode;
  COIN_LIST = cj.coins.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    rank: c.rank,
    price: c.price,
    market_cap: c.market_cap,
    exchanges: (c.exchanges && c.exchanges.length) ? c.exchanges : heuristicCoverage(c.rank, c.symbol)
  }));
} else {
  vm.runInContext(fs.readFileSync(path.join(dataDir, 'coins.js'), 'utf8'), ctx, { filename: 'coins.js' });
  const COINS = ctx.window.COINS;
  COIN_LIST = Object.keys(COINS).map((s) => ({ symbol: s, name: COINS[s].name, rank: 9999, price: null, market_cap: null, exchanges: COINS[s].exchanges }));
}
const COIN_MAP = Object.fromEntries(COIN_LIST.map((c) => [c.symbol.toUpperCase(), c]));
const coinCount = COIN_LIST.length;

// ---- 格式化 ----
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function pct(x) { return (x * 100).toFixed(3) + '%'; }
function usd(n) { return n == null ? 'n/a' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' USDT'; }
function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 1) return '$' + Number(p).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return '$' + Number(p).toPrecision(4);
}
function fmtCap(m) {
  if (m == null) return '—';
  if (m >= 1e12) return '$' + (m / 1e12).toFixed(2) + 'T';
  if (m >= 1e9) return '$' + (m / 1e9).toFixed(2) + 'B';
  if (m >= 1e6) return '$' + (m / 1e6).toFixed(2) + 'M';
  return '$' + m.toLocaleString();
}

const SITE = 'FeeEye';
const SITE_URL = 'https://feeeye.com';
const COVERAGE_NOTE = COVERAGE_MODE === 'coingecko-tickers'
  ? 'Exchange coverage verified via CoinGecko tickers.'
  : 'Exchange coverage is indicative (rank-based) — verify on each exchange. Prices are a CoinGecko snapshot.';

const DISCLOSURE = `
  <div class="disc">
    <b>Affiliate disclosure:</b> This site may earn a commission from exchanges at no extra cost to you.
    Links are marked <code>rel="sponsored"</code>. ${esc(COVERAGE_NOTE)} Fee snapshot ${esc(UPD)}.
    Not available in restricted regions (${esc(RESTRICTED_LABEL)}); we do not show signup links targeting those regions.
  </div>`;

function page({ title, desc, body, jsonLd, depth = 0, path }) {
  const up = '../'.repeat(depth);
  const canonical = `${SITE_URL}/${path}`;
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${ld}
<style>
:root{--bg:#f7f8fa;--card:#fff;--ink:#1c2430;--sub:#5b6776;--line:#e4e8ee;--brand:#2563eb;--brand2:#0ea5a4;--ok:#16a34a;--bad:#dc2626}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.65;font-size:15px}
.wrap{max-width:880px;margin:0 auto;padding:22px 18px 60px}
header nav{display:flex;align-items:center;justify-content:space-between;padding:6px 0 14px;border-bottom:1px solid var(--line);margin-bottom:20px;flex-wrap:wrap}
.logo{font-weight:800;color:var(--brand);font-size:18px}
nav a{color:var(--sub);text-decoration:none;font-size:13.5px;margin-left:14px}
h1{font-size:25px;margin-bottom:6px}
h3{margin-top:22px;font-size:18px}
.intro{color:var(--sub);margin-bottom:18px}
.disc{background:#fffbeb;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#92400e;margin:18px 0}
.disc code{background:#fde9c8;padding:1px 5px;border-radius:4px}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
th,td{border:1px solid var(--line);padding:10px 12px;text-align:left}
th{background:#f1f5f9;font-weight:600}
tr.kc{background:#eef4ff}
.cta{display:inline-block;background:var(--brand);color:#fff;padding:5px 12px;border-radius:7px;font-size:12.5px;font-weight:700;text-decoration:none}
.cta:hover{opacity:.9}
.na{color:var(--bad);font-weight:600}
.best{color:var(--ok);font-weight:700}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.card a{color:var(--brand);text-decoration:none;font-weight:600}
.foot{color:var(--sub);font-size:12px;margin-top:22px;text-align:center}
.note{background:#eef4ff;border:1px solid #c7d8ff;border-radius:10px;padding:10px 14px;font-size:13px;color:#1e40af;margin:14px 0}
.pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.pill{background:#eef4ff;border:1px solid #c7d8ff;color:#1e40af;border-radius:999px;padding:3px 10px;font-size:12.5px;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
<header><nav><span class="logo">${SITE}</span><span><a href="${up}tools/fee-calculator.html">Fee Calculator</a><a href="${up}tools/fee-calculator.html">Tools</a><a href="${up}index.html">Home</a></span></nav></header>
${body}
${DISCLOSURE}
<div class="foot">Educational only. Not financial advice. Verify all data on official exchange pages. Data snapshot ${esc(UPD)}.</div>
</div>
</body>
</html>`;
}

// ---- 区块构建 ----
function whereToBuy(c) {
  const name = c.name, symbol = c.symbol;
  const rows = Object.keys(EX).map((slug) => {
    const ex = EX[slug];
    const supported = c.exchanges.includes(slug);
    const cta = supported
      ? `<a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">Buy ${esc(name)} on KuCoin</a>`
      : '<span class="na">—</span>';
    return `<tr class="${slug === 'kucoin' ? 'kc' : ''}"><td><b>${ex.name}</b></td><td>${supported ? '✓' : '<span class="na">✗</span>'}</td><td>${pct(ex.spot.taker)}</td><td>${usd(getFee(slug, 'TRC20'))}</td><td>${cta}</td></tr>`;
  }).join('');
  const others = Object.keys(EX).filter((s) => s !== 'kucoin' && c.exchanges.includes(s)).slice(0, 4).map((s) => EX[s].name).join(', ');
  const priceLine = `<p class="intro">${esc(name)} (${esc(symbol)}) price: <b>${fmtPrice(c.price)}</b> · Market cap: <b>${fmtCap(c.market_cap)}</b> · Rank #${c.rank} (CoinGecko snapshot).</p>`;
  const body = `
  <h1>Where to Buy ${esc(name)} (${esc(symbol)}) in 2026</h1>
  <p class="intro">Compare where ${esc(name)} is listed, spot fees, and USDT (TRC20) withdrawal costs across major exchanges.</p>
  ${priceLine}
  <div class="note">Availability depends on your region — residents of ${esc(RESTRICTED_LABEL)} are not eligible. Always verify listing status on the exchange. ${esc(COVERAGE_NOTE)}</div>
  <table><thead><tr><th>Exchange</th><th>Lists ${esc(symbol)}</th><th>Spot taker</th><th>USDT TRC20 fee</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <p class="intro">${esc(name)} is also available on: ${esc(others) || '—'}. Use the <a href="../tools/fee-calculator.html">Fee Calculator</a> to compare your exact trade size.</p>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: `Where can I buy ${name} (${symbol})?`, answer: { '@type': 'Answer', text: `${name} (${symbol}) is listed on ${c.exchanges.length} exchanges including KuCoin, subject to regional availability. Compare fees above.` } },
      { '@type': 'Question', name: `Is KuCoin available in my country?`, answer: { '@type': 'Answer', text: `KuCoin is not available in restricted regions including ${RESTRICTED_LABEL}. Check the Fee Calculator region selector for eligibility.` } }
    ]
  };
  return page({ title: `Where to Buy ${name} (${symbol}) — Compare Exchanges`, desc: `Find where to buy ${name} (${symbol}) in 2026. Compare listings, spot fees and withdrawal costs across major exchanges.`, body, jsonLd, path: `where-to-buy/${c.symbol.toLowerCase()}.html` });
}

function exchangePage(slug) {
  const ex = EX[slug];
  const supportedCoins = COIN_LIST.filter((c) => c.exchanges.includes(slug)).length;
  const cmp = ['bybit', 'okx', 'binance'].filter((s) => s !== slug);
  const cmpLinks = cmp.map((s) => `<a href="../compare/kucoin-vs-${s}.html">KuCoin vs ${EX[s].name}</a>`).join(' · ');
  const body = `
  <h1>${ex.name} — Fees, Networks & Tools (2026)</h1>
  <p class="intro">Snapshot of ${ex.name} trading fees, USDT withdrawal costs, supported networks and features. Data ${esc(UPD)}.</p>
  <div class="grid">
    <div class="card"><b>Spot fee</b><br>Taker ${pct(ex.spot.taker)} · Maker ${pct(ex.spot.maker)}</div>
    <div class="card"><b>Futures fee</b><br>Taker ${pct(ex.futures.taker)} · Maker ${pct(ex.futures.maker)}</div>
    <div class="card"><b>USDT withdrawal</b><br>TRC20 ${usd(getFee(slug, 'TRC20'))} · ERC20 ${usd(getFee(slug, 'ERC20'))}</div>
    <div class="card"><b>Coins listed</b><br>${supportedCoins} of ${coinCount} tracked</div>
    <div class="card"><b>Trading bot</b><br>${ex.has_trading_bot ? 'Available' : 'No'}</div>
    <div class="card"><b>API</b><br>${ex.has_api ? 'Available' : 'No'}</div>
  </div>
  ${slug === 'kucoin' ? `<p style="margin-top:14px"><a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">Open a KuCoin account</a></p>` : ''}
  <p class="intro" style="margin-top:16px">Compare: ${cmpLinks}</p>`;
  return page({ title: `${ex.name} Review 2026 — Fees, Withdrawal & Features`, desc: `${ex.name} fees, USDT withdrawal costs, supported networks and trading features. Compare with other exchanges.`, body, path: `exchanges/${slug}.html` });
}

function comparePage(other) {
  const a = EX.kucoin, b = EX[other];
  const rows = [
    ['Spot taker', pct(a.spot.taker), pct(b.spot.taker)],
    ['Spot maker', pct(a.spot.maker), pct(b.spot.maker)],
    ['Futures taker', pct(a.futures.taker), pct(b.futures.taker)],
    ['USDT TRC20 withdrawal', usd(getFee('kucoin', 'TRC20')), usd(getFee(other, 'TRC20'))],
    ['USDT ERC20 withdrawal', usd(getFee('kucoin', 'ERC20')), usd(getFee(other, 'ERC20'))],
    ['Trading bot', a.has_trading_bot ? '✓' : '✗', b.has_trading_bot ? '✓' : '✗'],
    ['API', a.has_api ? '✓' : '✗', b.has_api ? '✗' : '✗']
  ].map((r) => `<tr><td>${r[0]}</td><td class="kc" style="background:#eef4ff">${r[1]}</td><td>${r[2]}</td></tr>`).join('');
  const body = `
  <h1>KuCoin vs ${b.name} — Fee & Feature Comparison (2026)</h1>
  <p class="intro">Side-by-side of trading fees, withdrawal costs and features. Data snapshot ${esc(UPD)}.</p>
  <div class="note">This is an objective comparison, not an endorsement. Choose based on your region and needs. Residents of ${esc(RESTRICTED_LABEL)} are not eligible for KuCoin.</div>
  <table><thead><tr><th>Feature</th><th>KuCoin</th><th>${b.name}</th></tr></thead><tbody>${rows}</tbody></table>
  <p style="margin-top:14px"><a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">Open KuCoin account</a></p>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: `KuCoin or ${b.name} — which has lower fees?`, answer: { '@type': 'Answer', text: `Spot taker fees: KuCoin ${pct(a.spot.taker)} vs ${b.name} ${pct(b.spot.taker)} (snapshot ${UPD}). Compare full table above.` } }]
  };
  return page({ title: `KuCoin vs ${b.name} 2026 — Fees & Features Compared`, desc: `KuCoin vs ${b.name}: compare spot/futures fees, USDT withdrawal costs and features.`, body, jsonLd, path: `compare/kucoin-vs-${other}.html` });
}

function countryPage(cc) {
  const info = CA[cc];
  const name = COUNTRY_NAMES[cc] || cc;
  const avail = Object.keys(EX).filter((s) => info.exchanges[s]);
  const rows = avail.map((slug) => {
    const ex = EX[slug];
    const cta = slug === 'kucoin'
      ? `<a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">Open KuCoin</a>`
      : '—';
    return `<tr class="${slug === 'kucoin' ? 'kc' : ''}"><td><b>${ex.name}</b></td><td>${pct(ex.spot.taker)}</td><td>${usd(getFee(slug, 'TRC20'))}</td><td>${cta}</td></tr>`;
  }).join('');
  const body = `
  <h1>Best Crypto Exchanges in ${esc(name)} (2026)</h1>
  <p class="intro">Compare major exchanges available to residents of ${esc(name)}, including spot fees and USDT (TRC20) withdrawal costs. Always confirm current eligibility on each exchange — listings and regional access change.</p>
  <div class="note">This page lists exchanges that may serve ${esc(name)} based on published regional availability. It is not legal advice. Complete KYC is required. Residents of ${esc(RESTRICTED_LABEL)} are not served.</div>
  <table><thead><tr><th>Exchange</th><th>Spot taker</th><th>USDT TRC20 fee</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <p class="intro">Use the <a href="../tools/fee-calculator.html">Fee Calculator</a> to compare your exact trade size across these exchanges.</p>`;
  return page({ title: `Best Crypto Exchanges in ${name} 2026 — Fees & Availability`, desc: `Compare crypto exchanges available in ${name}: spot fees, USDT withdrawal costs and regional availability.`, body, depth: 1, path: `${cc.toLowerCase()}/exchanges.html` });
}

function indexPage() {
  const top = [...COIN_LIST].sort((a, b) => a.rank - b.rank).slice(0, 24);
  const coins = top.map((c) => `<a class="pill" href="where-to-buy/${c.symbol.toLowerCase()}.html">${esc(c.name)} (${esc(c.symbol)})</a>`).join('');
  const countries = Object.keys(CA).filter((c) => !CA[c].restricted).slice(0, 10)
    .map((c) => `<a class="pill" href="${c.toLowerCase()}/exchanges.html">${COUNTRY_NAMES[c] || c}</a>`).join('');
  const body = `
  <h1>Free Crypto Tools & Exchange Data</h1>
  <p class="intro">Compare exchange fees, find where to buy a token, and check withdrawal costs — free, no signup. Tracking ${coinCount} coins across ${Object.keys(EX).length} exchanges.</p>
  <div class="grid">
    <div class="card"><b>💱 Fee Calculator</b><br>Compare trading &amp; withdrawal fees across ${Object.keys(EX).length} exchanges.<br><a href="tools/fee-calculator.html">Open tool →</a></div>
    <div class="card"><b>🪙 Where to Buy</b><br>Find which exchange lists a token.<br><a href="where-to-buy/pepe.html">Example: PEPE →</a></div>
    <div class="card"><b>🏦 Exchange Pages</b><br>Fees &amp; features per exchange.<br><a href="exchanges/kucoin.html">KuCoin →</a></div>
    <div class="card"><b>⚖️ Comparisons</b><br>KuCoin vs others.<br><a href="compare/kucoin-vs-bybit.html">vs Bybit →</a></div>
  </div>
  <h3>Popular tokens (${coinCount} tracked)</h3>
  <div class="pills">${coins}</div>
  <h3>By region</h3>
  <div class="pills">${countries}</div>`;
  return page({ title: 'FeeEye — Free Crypto Fee Calculator & Exchange Data', desc: 'Free crypto tools: compare exchange fees, find where to buy tokens, check withdrawal costs. No signup.', body, path: 'index.html' });
}

// ---- 写入 ----
// 先清空旧 dist，避免上一版 coins.js 残留页面被索引
fs.rmSync(distDir, { recursive: true, force: true });

const urls = [];
function write(rel, html) {
  const p = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
  urls.push(rel);
}

let count = 0;
write('index.html', indexPage()); count++;

for (const c of COIN_LIST) {
  write(`where-to-buy/${c.symbol.toLowerCase()}.html`, whereToBuy(c)); count++;
}
for (const slug of Object.keys(EX)) {
  write(`exchanges/${slug}.html`, exchangePage(slug)); count++;
}
for (const other of ['bybit', 'okx', 'binance', 'bitget']) {
  if (EX[other]) { write(`compare/kucoin-vs-${other}.html`, comparePage(other)); count++; }
}
// 国家页：仅非受限地区（合规友好，绝不引导受限地区）
let countryCount = 0;
for (const cc of Object.keys(CA)) {
  if (CA[cc].restricted) continue;
  write(`${cc.toLowerCase()}/exchanges.html`, countryPage(cc)); count++; countryCount++;
}

// 拷贝工具与数据，使站内计算器可用
fs.cpSync(toolsDir, path.join(distDir, 'tools'), { recursive: true });
fs.cpSync(dataDir, path.join(distDir, 'data'), { recursive: true });

// sitemap.xml + robots.txt（SEO 基础，上线前必须）
const today = new Date().toISOString().slice(0, 10);
const pages = urls.filter((u) => u.endsWith('.html'));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((u) => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`✅ Generated ${count} static pages (coins=${coinCount}, countries=${countryCount}) into dist/ [coverage_mode=${COVERAGE_MODE}].`);
