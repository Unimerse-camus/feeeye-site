#!/usr/bin/env node
/**
 * generate.mjs — P3 程序化 SEO 静态生成器（零依赖，中英双语）
 * =========================================================
 * 复用 data/exchanges.js + data/country_availability.js（vm 加载），
 * 币种优先读取 data/coins.json（CoinGecko 真实快照）。产出：
 *   en: dist/index.html, dist/where-to-buy/[coin].html, dist/exchanges/[x].html,
 *       dist/compare/kucoin-vs-[x].html, dist/[country]/exchanges.html
 *   zh: dist/zh/ 下同构中文版（服务海外华人，合规地区过滤一致）
 * 并拷贝 tools/ 与 data/ 进 dist；生成 sitemap.xml + robots.txt。
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

// ---- 国际化文案（en / zh）----
const I18N = {
  en: {
    navFee: 'Fee Calculator', navTools: 'Tools', navHome: 'Home', navZh: '中文',
    discT: 'Affiliate disclosure:', discB: 'This site may earn a commission from exchanges at no extra cost to you. Links are marked rel="sponsored".',
    foot: 'Educational only. Not financial advice. Verify all data on official exchange pages. Data snapshot ',
    noteAvail: 'Availability depends on your region — residents of {r} are not eligible. Always verify listing status on the exchange.',
    thExchange: 'Exchange', thLists: 'Lists {s}', thTaker: 'Spot taker', thFee20: 'USDT TRC20 fee',
    ctaBuy: 'Buy {n} on KuCoin', ctaOpen: 'Open KuCoin', ctaAcct: 'Open a KuCoin account',
    alsoOn: '{n} is also available on: {o}. Use the Fee Calculator to compare your exact trade size.',
    priceLine: '{n} ({s}) price: {p} · Market cap: {m} · Rank #{r} (CoinGecko snapshot).',
    wbH1: 'Where to Buy {n} ({s}) in 2026',
    wbIntro: 'Compare where {n} is listed, spot fees, and USDT (TRC20) withdrawal costs across major exchanges.',
    wbTitle: 'Where to Buy {n} ({s}) — Compare Exchanges',
    wbDesc: 'Find where to buy {n} ({s}) in 2026. Compare listings, spot fees and withdrawal costs across major exchanges.',
    wbQ1: 'Where can I buy {n} ({s})?', wbA1: '{n} ({s}) is listed on {c} exchanges including KuCoin, subject to regional availability. Compare fees above.',
    wbQ2: 'Is KuCoin available in my country?', wbA2: 'KuCoin is not available in restricted regions including {r}. Check the Fee Calculator region selector for eligibility.',
    exH1: '{n} — Fees, Networks & Tools (2026)',
    exIntro: 'Snapshot of {n} trading fees, USDT withdrawal costs, supported networks and features. Data {u}.',
    exSpot: 'Spot fee', exFutures: 'Futures fee', exWd: 'USDT withdrawal', exCoins: 'Coins listed', exBot: 'Trading bot', exApi: 'API',
    exOf: '{a} of {c} tracked', exBotYes: 'Available', exBotNo: 'No',
    exTitle: '{n} Review 2026 — Fees, Withdrawal & Features',
    exDesc: '{n} fees, USDT withdrawal costs, supported networks and trading features. Compare with other exchanges.',
    exCompare: 'Compare: ',
    cpH1: 'KuCoin vs {n} — Fee & Feature Comparison (2026)',
    cpIntro: 'Side-by-side of trading fees, withdrawal costs and features. Data snapshot {u}.',
    cpNote: 'This is an objective comparison, not an endorsement. Choose based on your region and needs. Residents of {r} are not eligible for KuCoin.',
    cpTh: 'Feature', cpQ1: 'KuCoin or {n} — which has lower fees?',
    cpA1: 'Spot taker fees: KuCoin {k} vs {n} {o} (snapshot {u}). Compare full table above.',
    cpTitle: 'KuCoin vs {n} 2026 — Fees & Features Compared',
    cpDesc: 'KuCoin vs {n}: compare spot/futures fees, USDT withdrawal costs and features.',
    fSpotTaker: 'Spot taker', fSpotMaker: 'Spot maker', fFutTaker: 'Futures taker', fWd20: 'USDT TRC20 withdrawal', fWdErc: 'USDT ERC20 withdrawal', fBot: 'Trading bot', fApi: 'API',
    cyH1: 'Best Crypto Exchanges in {n} (2026)',
    cyIntro: 'Compare major exchanges available to residents of {n}, including spot fees and USDT (TRC20) withdrawal costs. Always confirm current eligibility on each exchange — listings and regional access change.',
    cyNote: 'This page lists exchanges that may serve {n} based on published regional availability. It is not legal advice. Complete KYC is required. Residents of {r} are not served.',
    cyTitle: 'Best Crypto Exchanges in {n} 2026 — Fees & Availability',
    cyDesc: 'Compare crypto exchanges available in {n}: spot fees, USDT withdrawal costs and regional availability.',
    cyUse: 'Use the Fee Calculator to compare your exact trade size across these exchanges.',
    idxH1: 'Free Crypto Tools & Exchange Data',
    idxIntro: 'Compare exchange fees, find where to buy a token, and check withdrawal costs — free, no signup. Tracking {c} coins across {e} exchanges.',
    idxFeeT: '💱 Fee Calculator', idxFeeB: 'Compare trading & withdrawal fees across {e} exchanges.', idxOpen: 'Open tool →',
    idxWbT: '🪙 Where to Buy', idxWbB: 'Find which exchange lists a token.', idxEx: 'Example: PEPE →',
    idxExT: '🏦 Exchange Pages', idxExB: 'Fees & features per exchange.',
    idxCpB: 'KuCoin vs others.',
    idxPopular: 'Popular tokens ({c} tracked)', idxRegion: 'By region',
    idxTitle: 'FeeEye — Free Crypto Fee Calculator & Exchange Data',
    idxDesc: 'Free crypto tools: compare exchange fees, find where to buy tokens, check withdrawal costs. No signup.',
    coverageNote: 'Exchange coverage verified via CoinGecko tickers.'
  },
  zh: {
    navFee: '手续费计算器', navTools: '工具', navHome: '首页', navZh: 'English',
    discT: '联盟披露：', discB: '本站可能从交易所获得推广佣金，但不会增加你的成本。链接均已标记 rel="sponsored"。',
    foot: '仅供教育参考，不构成投资建议。请以各交易所官方页面核实所有数据。数据快照 ',
    noteAvail: '可用性取决于你所在地区——{r} 等受限地区居民不适用。请始终在交易所核实上架状态。',
    thExchange: '交易所', thLists: '上架 {s}', thTaker: '现货吃单费率', thFee20: 'USDT TRC20 提币费',
    ctaBuy: '在 KuCoin 购买 {n}', ctaOpen: '打开 KuCoin', ctaAcct: '注册 KuCoin 账户',
    alsoOn: '{n} 还可在以下平台购买：{o}。使用手续费计算器对比你的具体交易成本。',
    priceLine: '{n}（{s}）价格：{p} · 市值：{m} · 排名 #{r}（CoinGecko 快照）。',
    wbH1: '2026 年在哪里购买 {n}（{s}）',
    wbIntro: '对比 {n} 的上架平台、现货费率及 USDT（TRC20）提币成本。',
    wbTitle: '在哪里购买 {n}（{s}）——交易所对比',
    wbDesc: '查找 2026 年在哪里购买 {n}（{s}）。对比各大交易所的上架情况、现货费率与提币成本。',
    wbQ1: '我可以在哪里购买 {n}（{s}）？', wbA1: '{n}（{s}）已在 {c} 家交易所上架（含 KuCoin），具体取决于地区可用性。请对比上方费率。',
    wbQ2: 'KuCoin 在我的国家可用吗？', wbA2: 'KuCoin 不向 {r} 等受限地区提供服务。请使用手续费计算器的地区选择器确认资格。',
    exH1: '{n}——费率、网络与工具（2026）',
    exIntro: '{n} 交易费率、USDT 提币成本、支持网络与功能快照。数据更新至 {u}。',
    exSpot: '现货费率', exFutures: '合约费率', exWd: 'USDT 提币', exCoins: '上架币种', exBot: '交易机器人', exApi: 'API',
    exOf: '已追踪 {c} 个中的 {a} 个', exBotYes: '支持', exBotNo: '不支持',
    exTitle: '{n} 2026 评测——费率、提币与功能',
    exDesc: '{n} 费率、USDT 提币成本、支持网络与交易功能。与其他交易所对比。',
    exCompare: '对比：',
    cpH1: 'KuCoin vs {n}——费率与功能对比（2026）',
    cpIntro: '交易费率、提币成本与功能并列对比。数据快照 {u}。',
    cpNote: '这是客观对比，并非推荐。请根据你的地区和需求选择。{r} 等受限地区居民不适用 KuCoin。',
    cpTh: '功能', cpQ1: 'KuCoin 还是 {n}——哪家费率更低？',
    cpA1: '现货吃单费率：KuCoin {k} vs {n} {o}（快照 {u}）。请对比上方完整表格。',
    cpTitle: 'KuCoin vs {n} 2026——费率与功能对比',
    cpDesc: 'KuCoin vs {n}：对比现货/合约费率、USDT 提币成本与功能。',
    fSpotTaker: '现货吃单', fSpotMaker: '现货挂单', fFutTaker: '合约吃单', fWd20: 'USDT TRC20 提币', fWdErc: 'USDT ERC20 提币', fBot: '交易机器人', fApi: 'API',
    cyH1: '{n} 最佳加密货币交易所（2026）',
    cyIntro: '对比 {n} 居民可用的主流交易所，包括现货费率与 USDT（TRC20）提币成本。各交易所的地区可用性与上架情况会变化，请始终确认最新状态。',
    cyNote: '本页基于公开的地区可用性列出可能服务 {n} 的交易所，不构成法律意见。需完成 KYC。{r} 等受限地区居民不适用。',
    cyTitle: '{n} 最佳加密货币交易所 2026——费率与可用性',
    cyDesc: '对比 {n} 可用的加密货币交易所：现货费率、USDT 提币成本与地区可用性。',
    cyUse: '使用手续费计算器对比你在这些交易所的具体交易成本。',
    idxH1: '免费加密货币工具与交易所数据',
    idxIntro: '对比交易所费率、查找代币在哪里购买、查看提币成本——免费、无需注册。追踪 {c} 个币种、{e} 家交易所。',
    idxFeeT: '💱 手续费计算器', idxFeeB: '对比 {e} 家交易所的交易与提币费率。', idxOpen: '打开工具 →',
    idxWbT: '🪙 在哪里购买', idxWbB: '查找某代币在哪些交易所上架。', idxEx: '示例：PEPE →',
    idxExT: '🏦 交易所页面', idxExB: '每家交易所的费率与功能。',
    idxCpB: 'KuCoin 与其他交易所对比。',
    idxPopular: '热门代币（已追踪 {c} 个）', idxRegion: '按地区',
    idxTitle: 'FeeEye——免费加密货币费率计算器与交易所数据',
    idxDesc: '免费加密货币工具：对比交易所费率、查找代币在哪里购买、查看提币成本。无需注册。',
    coverageNote: '上币覆盖已通过 CoinGecko tickers 核实。'
  }
};

function T(lang, key, vars) {
  let s = I18N[lang][key] || I18N.en[key] || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
  return s;
}
// 根路径绝对链接（修复：zh 页面相对链接叠层导致 404 / 跳错语言）
function absPath(lang, rel) {
  return (lang === 'zh' ? '/zh/' : '/') + rel;
}
// 工具页：zh 用中文版，en 用英文版
function toolPath(lang) {
  return 'tools/fee-calculator' + (lang === 'zh' ? '.zh' : '') + '.html';
}
const COVERAGE_NOTE = (lang) => COVERAGE_MODE === 'coingecko-tickers'
  ? T(lang, 'coverageNote')
  : (lang === 'zh' ? '上币覆盖为估算值（基于排名），请在各交易所核实。价格为 CoinGecko 快照。' : 'Exchange coverage is indicative (rank-based) — verify on each exchange. Prices are a CoinGecko snapshot.');

function page({ lang, title, desc, body, jsonLd, depth = 0, path }) {
  const i = I18N[lang];
  const canonical = `${SITE_URL}/${path}`;
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  const disc = `${esc(i.discT)} ${esc(i.discB)} ${esc(COVERAGE_NOTE(lang))} ${esc(T(lang, 'foot', { u: '' }).split('。')[0] + ' ' + UPD)}`;
  const discHtml = `
  <div class="disc">
    <b>${esc(i.discT)}</b> ${esc(i.discB)} ${esc(COVERAGE_NOTE(lang))} ${esc(lang === 'zh' ? '费率快照 ' + UPD : 'Fee snapshot ' + UPD)}.
    ${esc(lang === 'zh' ? '不适用于受限地区（' + RESTRICTED_LABEL + '）；我们不会面向这些地区显示注册引导。' : 'Not available in restricted regions (' + RESTRICTED_LABEL + '); we do not show signup links targeting those regions.')}
  </div>`;
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${SITE_URL}/${lang === 'zh' ? path.replace(/^zh\//, '') : path}">
${lang === 'zh' ? `<link rel="alternate" hreflang="zh" href="${SITE_URL}/${path}">` : `<link rel="alternate" hreflang="zh" href="${SITE_URL}/zh/${path}">`}
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${ld}
<style>
:root{--bg:#f7f8fa;--card:#fff;--ink:#1c2430;--sub:#5b6776;--line:#e4e8ee;--brand:#2563eb;--brand2:#0ea5a4;--ok:#16a34a;--bad:#dc2626}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.65;font-size:15px}
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
<header><nav><span class="logo">${SITE}</span><span><a href="${absPath(lang, toolPath(lang))}">${esc(i.navFee)}</a><a href="${lang === 'zh' ? '/zh/' : '/'}">${esc(i.navHome)}</a><a href="${lang === 'zh' ? '/' : '/zh/'}">${esc(i.navZh)}</a></span></nav></header>
${body}
${discHtml}
<div class="foot">${esc(i.foot)} ${esc(UPD)}.</div>
</div>
</body>
</html>`;
}

// ---- 区块构建（en / zh 双语言）----
function whereToBuy(c, lang) {
  const name = c.name, symbol = c.symbol;
  const rows = Object.keys(EX).map((slug) => {
    const ex = EX[slug];
    const supported = c.exchanges.includes(slug);
    const cta = supported
      ? `<a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">${esc(T(lang, 'ctaBuy', { n: name }))}</a>`
      : '<span class="na">—</span>';
    return `<tr class="${slug === 'kucoin' ? 'kc' : ''}"><td><b>${ex.name}</b></td><td>${supported ? '✓' : '<span class="na">✗</span>'}</td><td>${pct(ex.spot.taker)}</td><td>${usd(getFee(slug, 'TRC20'))}</td><td>${cta}</td></tr>`;
  }).join('');
  const others = Object.keys(EX).filter((s) => s !== 'kucoin' && c.exchanges.includes(s)).slice(0, 4).map((s) => EX[s].name).join(', ');
  const priceLine = `<p class="intro">${esc(T(lang, 'priceLine', { n: name, s: symbol, p: fmtPrice(c.price), m: fmtCap(c.market_cap), r: c.rank }))}</p>`;
  const body = `
  <h1>${esc(T(lang, 'wbH1', { n: name, s: symbol }))}</h1>
  <p class="intro">${esc(T(lang, 'wbIntro', { n: name }))}</p>
  ${priceLine}
  <div class="note">${esc(T(lang, 'noteAvail', { r: RESTRICTED_LABEL }))} ${esc(COVERAGE_NOTE(lang))}</div>
  <table><thead><tr><th>${esc(T(lang, 'thExchange'))}</th><th>${esc(T(lang, 'thLists', { s: symbol }))}</th><th>${esc(T(lang, 'thTaker'))}</th><th>${esc(T(lang, 'thFee20'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <p class="intro">${esc(T(lang, 'alsoOn', { n: name, o: others || '—' }))}</p>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: T(lang, 'wbQ1', { n: name, s: symbol }), answer: { '@type': 'Answer', text: T(lang, 'wbA1', { n: name, s: symbol, c: c.exchanges.length }) } },
      { '@type': 'Question', name: T(lang, 'wbQ2'), answer: { '@type': 'Answer', text: T(lang, 'wbA2', { r: RESTRICTED_LABEL }) } }
    ]
  };
  return page({ lang, title: T(lang, 'wbTitle', { n: name, s: symbol }), desc: T(lang, 'wbDesc', { n: name, s: symbol }), body, jsonLd, path: `${lang === 'zh' ? 'zh/' : ''}where-to-buy/${c.symbol.toLowerCase()}.html` });
}

function exchangePage(slug, lang) {
  const ex = EX[slug];
  const supportedCoins = COIN_LIST.filter((c) => c.exchanges.includes(slug)).length;
  const cmp = ['bybit', 'okx', 'binance'].filter((s) => s !== slug);
  const cmpLinks = cmp.map((s) => `<a href="${absPath(lang, 'compare/kucoin-vs-' + s + '.html')}">KuCoin vs ${EX[s].name}</a>`).join(' · ');
  const body = `
  <h1>${esc(T(lang, 'exH1', { n: ex.name }))}</h1>
  <p class="intro">${esc(T(lang, 'exIntro', { n: ex.name, u: UPD }))}</p>
  <div class="grid">
    <div class="card"><b>${esc(T(lang, 'exSpot'))}</b><br>${esc(T(lang, 'thTaker'))} ${pct(ex.spot.taker)} · ${esc(lang === 'zh' ? '挂单' : 'Maker')} ${pct(ex.spot.maker)}</div>
    <div class="card"><b>${esc(T(lang, 'exFutures'))}</b><br>${esc(T(lang, 'thTaker'))} ${pct(ex.futures.taker)} · ${esc(lang === 'zh' ? '挂单' : 'Maker')} ${pct(ex.futures.maker)}</div>
    <div class="card"><b>${esc(T(lang, 'exWd'))}</b><br>TRC20 ${usd(getFee(slug, 'TRC20'))} · ERC20 ${usd(getFee(slug, 'ERC20'))}</div>
    <div class="card"><b>${esc(T(lang, 'exCoins'))}</b><br>${esc(T(lang, 'exOf', { a: supportedCoins, c: coinCount }))}</div>
    <div class="card"><b>${esc(T(lang, 'exBot'))}</b><br>${ex.has_trading_bot ? T(lang, 'exBotYes') : T(lang, 'exBotNo')}</div>
    <div class="card"><b>${esc(T(lang, 'exApi'))}</b><br>${ex.has_api ? T(lang, 'exBotYes') : T(lang, 'exBotNo')}</div>
  </div>
  ${slug === 'kucoin' ? `<p style="margin-top:14px"><a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">${esc(T(lang, 'ctaAcct'))}</a></p>` : ''}
  <p class="intro" style="margin-top:16px">${esc(T(lang, 'exCompare'))}${cmpLinks}</p>`;
  return page({ lang, title: T(lang, 'exTitle', { n: ex.name }), desc: T(lang, 'exDesc', { n: ex.name }), body, path: `${lang === 'zh' ? 'zh/' : ''}exchanges/${slug}.html` });
}

function comparePage(other, lang) {
  const a = EX.kucoin, b = EX[other];
  const rows = [
    [T(lang, 'fSpotTaker'), pct(a.spot.taker), pct(b.spot.taker)],
    [T(lang, 'fSpotMaker'), pct(a.spot.maker), pct(b.spot.maker)],
    [T(lang, 'fFutTaker'), pct(a.futures.taker), pct(b.futures.taker)],
    [T(lang, 'fWd20'), usd(getFee('kucoin', 'TRC20')), usd(getFee(other, 'TRC20'))],
    [T(lang, 'fWdErc'), usd(getFee('kucoin', 'ERC20')), usd(getFee(other, 'ERC20'))],
    [T(lang, 'fBot'), a.has_trading_bot ? '✓' : '✗', b.has_trading_bot ? '✓' : '✗'],
    [T(lang, 'fApi'), a.has_api ? '✓' : '✗', b.has_api ? '✗' : '✗']
  ].map((r) => `<tr><td>${esc(r[0])}</td><td class="kc" style="background:#eef4ff">${r[1]}</td><td>${r[2]}</td></tr>`).join('');
  const body = `
  <h1>${esc(T(lang, 'cpH1', { n: b.name }))}</h1>
  <p class="intro">${esc(T(lang, 'cpIntro', { u: UPD }))}</p>
  <div class="note">${esc(T(lang, 'cpNote', { r: RESTRICTED_LABEL }))}</div>
  <table><thead><tr><th>${esc(T(lang, 'cpTh'))}</th><th>KuCoin</th><th>${b.name}</th></tr></thead><tbody>${rows}</tbody></table>
  <p style="margin-top:14px"><a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">${esc(T(lang, 'ctaOpen'))}</a></p>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: T(lang, 'cpQ1', { n: b.name }), answer: { '@type': 'Answer', text: T(lang, 'cpA1', { n: b.name, k: pct(a.spot.taker), o: pct(b.spot.taker), u: UPD }) } }]
  };
  return page({ lang, title: T(lang, 'cpTitle', { n: b.name }), desc: T(lang, 'cpDesc', { n: b.name }), body, jsonLd, path: `${lang === 'zh' ? 'zh/' : ''}compare/kucoin-vs-${other}.html` });
}

function countryPage(cc, lang) {
  const info = CA[cc];
  const name = COUNTRY_NAMES[cc] || cc;
  const avail = Object.keys(EX).filter((s) => info.exchanges[s]);
  const rows = avail.map((slug) => {
    const ex = EX[slug];
    const cta = slug === 'kucoin'
      ? `<a class="cta" href="${KU_LINK}" rel="sponsored nofollow" target="_blank">${esc(T(lang, 'ctaOpen'))}</a>`
      : '—';
    return `<tr class="${slug === 'kucoin' ? 'kc' : ''}"><td><b>${ex.name}</b></td><td>${pct(ex.spot.taker)}</td><td>${usd(getFee(slug, 'TRC20'))}</td><td>${cta}</td></tr>`;
  }).join('');
  const body = `
  <h1>${esc(T(lang, 'cyH1', { n: name }))}</h1>
  <p class="intro">${esc(T(lang, 'cyIntro', { n: name }))}</p>
  <div class="note">${esc(T(lang, 'cyNote', { n: name, r: RESTRICTED_LABEL }))}</div>
  <table><thead><tr><th>${esc(T(lang, 'thExchange'))}</th><th>${esc(T(lang, 'thTaker'))}</th><th>${esc(T(lang, 'thFee20'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <p class="intro">${esc(T(lang, 'cyUse'))}</p>`;
  return page({ lang, title: T(lang, 'cyTitle', { n: name }), desc: T(lang, 'cyDesc', { n: name }), body, depth: lang === 'zh' ? 2 : 1, path: `${lang === 'zh' ? 'zh/' : ''}${cc.toLowerCase()}/exchanges.html` });
}

function indexPage(lang) {
  const top = [...COIN_LIST].sort((a, b) => a.rank - b.rank).slice(0, 24);
  const p = (rel) => absPath(lang, rel);
  const coins = top.map((c) => `<a class="pill" href="${p('where-to-buy/' + c.symbol.toLowerCase() + '.html')}">${esc(c.name)} (${esc(c.symbol)})</a>`).join('');
  const countries = Object.keys(CA).filter((c) => !CA[c].restricted).slice(0, 10)
    .map((c) => `<a class="pill" href="${p(c.toLowerCase() + '/exchanges.html')}">${COUNTRY_NAMES[c] || c}</a>`).join('');
  const body = `
  <h1>${esc(T(lang, 'idxH1'))}</h1>
  <p class="intro">${esc(T(lang, 'idxIntro', { c: coinCount, e: Object.keys(EX).length }))}</p>
  <div class="grid">
    <div class="card"><b>${esc(T(lang, 'idxFeeT'))}</b><br>${esc(T(lang, 'idxFeeB', { e: Object.keys(EX).length }))}<br><a href="${p(toolPath(lang))}">${esc(T(lang, 'idxOpen'))}</a></div>
    <div class="card"><b>${esc(T(lang, 'idxWbT'))}</b><br>${esc(T(lang, 'idxWbB'))}<br><a href="${p('where-to-buy/pepe.html')}">${esc(T(lang, 'idxEx'))}</a></div>
    <div class="card"><b>${esc(T(lang, 'idxExT'))}</b><br>${esc(T(lang, 'idxExB'))}<br><a href="${p('exchanges/kucoin.html')}">KuCoin →</a></div>
    <div class="card"><b>⚖️ Comparisons</b><br>${esc(T(lang, 'idxCpB'))}<br><a href="${p('compare/kucoin-vs-bybit.html')}">vs Bybit →</a></div>
  </div>
  <h3>${esc(T(lang, 'idxPopular', { c: coinCount }))}</h3>
  <div class="pills">${coins}</div>
  <h3>${esc(T(lang, 'idxRegion'))}</h3>
  <div class="pills">${countries}</div>`;
  return page({ lang, title: T(lang, 'idxTitle'), desc: T(lang, 'idxDesc'), body, path: `${lang === 'zh' ? 'zh/' : ''}index.html` });
}

// ---- 写入 ----
fs.rmSync(distDir, { recursive: true, force: true });

const urls = [];
function write(rel, html) {
  const p = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
  urls.push(rel);
}

let count = 0;
for (const lang of ['en', 'zh']) {
  write(`${lang === 'zh' ? 'zh/' : ''}index.html`, indexPage(lang)); count++;
  for (const c of COIN_LIST) {
    write(`${lang === 'zh' ? 'zh/' : ''}where-to-buy/${c.symbol.toLowerCase()}.html`, whereToBuy(c, lang)); count++;
  }
  for (const slug of Object.keys(EX)) {
    write(`${lang === 'zh' ? 'zh/' : ''}exchanges/${slug}.html`, exchangePage(slug, lang)); count++;
  }
  for (const other of ['bybit', 'okx', 'binance', 'bitget']) {
    if (EX[other]) { write(`${lang === 'zh' ? 'zh/' : ''}compare/kucoin-vs-${other}.html`, comparePage(other, lang)); count++; }
  }
  for (const cc of Object.keys(CA)) {
    if (CA[cc].restricted) continue;
    write(`${lang === 'zh' ? 'zh/' : ''}${cc.toLowerCase()}/exchanges.html`, countryPage(cc, lang)); count++;
  }
}

// 拷贝工具与数据，使站内计算器可用（en 根 + zh 双语目录各一份，工具页以 ../data/ 相对引用）
fs.cpSync(toolsDir, path.join(distDir, 'tools'), { recursive: true });
fs.cpSync(dataDir, path.join(distDir, 'data'), { recursive: true });
fs.cpSync(toolsDir, path.join(distDir, 'zh', 'tools'), { recursive: true });
fs.cpSync(dataDir, path.join(distDir, 'zh', 'data'), { recursive: true });

// sitemap.xml + robots.txt
const today = new Date().toISOString().slice(0, 10);
const pages = urls.filter((u) => u.endsWith('.html'));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((u) => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// 404 兜底页（绝对链接，防止任何相对链接在错误路径下继续叠层）
write('404.html', `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page not found — FeeEye</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;background:#f7f8fa;color:#1c2430;text-align:center;padding:80px 20px;line-height:1.7}
h1{font-size:26px;margin-bottom:8px}a{color:#2563eb;text-decoration:none;font-weight:600;margin:0 8px}</style></head>
<body>
<h1>404 — Page not found / 页面未找到</h1>
<p>The page you are looking for does not exist.<br>您访问的页面不存在。</p>
<p><a href="/">English Home</a> · <a href="/zh/">中文首页</a> · <a href="/tools/fee-calculator.html">Fee Calculator</a> · <a href="/zh/tools/fee-calculator.zh.html">手续费计算器</a></p>
</body></html>`);

console.log(`✅ Generated ${count} static pages (en+zh, coins=${coinCount}, countries=${Object.keys(CA).filter((c) => !CA[c].restricted).length}) into dist/ [coverage_mode=${COVERAGE_MODE}].`);
