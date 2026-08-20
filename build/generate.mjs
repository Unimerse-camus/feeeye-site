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
import { validateExchangeData } from './exchange_data_validation.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const distDir = path.join(root, 'dist');
const toolsDir = path.join(root, 'tools');
const assetsDir = path.join(root, 'assets');

// ---- 加载数据（vm 注入 window 垫片）----
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ['exchanges.js', 'country_availability.js']) {
  vm.runInContext(fs.readFileSync(path.join(dataDir, f), 'utf8'), ctx, { filename: f });
}
const EX = ctx.window.EXCHANGES;
const EXCHANGE_COMPARE = ctx.window.EXCHANGE_COMPARE || {};
const CA = ctx.window.COUNTRY_AVAILABILITY;
const COUNTRY_NAMES = ctx.window.COUNTRY_NAMES || {};
const getFee = ctx.window.getUsdtWithdrawalFee;
const getWithdrawalQuote = ctx.window.getUsdtWithdrawalQuote;
const getWithdrawalNetworks = ctx.window.getUsdtWithdrawalNetworks;
const exchangeValidation = validateExchangeData(EX, EXCHANGE_COMPARE);
if (exchangeValidation.errors.length) throw new Error(`Exchange data validation failed:\n${exchangeValidation.errors.join('\n')}`);
for (const warning of exchangeValidation.warnings) console.warn(`[data warning] ${warning}`);
let UPD = ''; // 在 coins.json 读取后赋值（line 107）
const RESTRICTED_LABEL = ['US', 'CN', 'HK', 'SG'].join(', ');

// 平台币抵扣是高变动字段：构建时拒绝无来源、无适用市场或非法折扣比例，
// 避免模板再次把未经核实的统一折扣套到所有产品。
for (const [slug, ex] of Object.entries(EX)) {
  const disc = ex.token_discount;
  if (!disc) continue;
  const rates = [disc.spot, disc.futures].filter((v) => v != null);
  if (!disc.token || !disc.source || !disc.note?.en || !disc.note?.zh || rates.length === 0 || rates.some((v) => typeof v !== 'number' || v <= 0 || v >= 1)) {
    throw new Error(`Invalid token_discount data for ${slug}`);
  }
}

// 币种分类：coins.json 的 category 字段（fetch_coins.mjs 从 CoinGecko categories 映射）→ 显示文字。
// 中性 key 排序 + 双语标签。coins.json 无 category 时回退 'other'。
const CATEGORY_LABEL = {
  en: { l1: 'Layer 1 / Smart Contracts', meme: 'Meme', exchange: 'Exchange Token', rwa: 'RWA / Tokenized', defi: 'DeFi / DEX', stable: 'Stablecoin', other: 'Other' },
  zh: { l1: '公链', meme: 'Meme', exchange: '平台币', rwa: 'RWA/代币化资产', defi: 'DeFi/DEX', stable: '稳定币', other: '其他' }
};
const CATEGORY_ORDER = ['l1', 'meme', 'exchange', 'rwa', 'defi', 'stable', 'other'];
// 兜底：coins.json 尚无 category 字段时，用人工字典按 symbol 归类（热门币）。
// 一旦 fetch 拉取 category 后，此字典自动失效（category 字段优先）。
const COIN_CATEGORY_FALLBACK = {
  BTC: 'l1', ETH: 'l1', BNB: 'l1', XRP: 'l1', SOL: 'l1', ADA: 'l1', AVAX: 'l1', DOT: 'l1', NEAR: 'l1', SUI: 'l1', APT: 'l1', TON: 'l1', LINK: 'l1', HBAR: 'l1', TRX: 'l1', BCH: 'l1', LTC: 'l1', XLM: 'l1', XMR: 'l1', ZEC: 'l1',
  DOGE: 'meme', SHIB: 'meme', PEPE: 'meme', BONK: 'meme', FLOKI: 'meme', WIF: 'meme',
  LEO: 'exchange', OKB: 'exchange', CRO: 'exchange', KCS: 'exchange', BGB: 'exchange',
  UNI: 'defi', HYPE: 'defi',
  PAXG: 'rwa', XAUT: 'rwa', USYC: 'rwa'
};
function catOf(c) {
  return (c.category && c.category !== 'other') ? c.category : (COIN_CATEGORY_FALLBACK[c.symbol] || 'other');
}

// CTA 链接规则：有 affiliate 用 affiliate（rel=sponsored nofollow），否则用官网（rel=noopener）
function linkFor(slug) {
  const ex = EX[slug];
  return ex.affiliate_link || ex.official_url || null;
}
function ctaHtml(slug, label, lang) {
  const ex = EX[slug];
  if (ex.affiliate_link) {
    return `<a class="cta" href="${ex.affiliate_link}" rel="sponsored nofollow" target="_blank">${label}</a>`;
  }
  if (ex.official_url) {
    return `<a class="cta" href="${ex.official_url}" rel="noopener" target="_blank">${label}</a>`;
  }
  return '<span class="na">—</span>';
}

// 内联 SVG 图标（Lucide 风格，替代彩色 emoji，避免无 Noto Color Emoji 环境显示豆腐块）
const SVG_ATTR = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICON = {
  receipt: `<svg ${SVG_ATTR}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>`,
  scale: `<svg ${SVG_ATTR}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`,
  coins: `<svg ${SVG_ATTR}><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>`,
  trend: `<svg ${SVG_ATTR}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>`,
  shield: `<svg ${SVG_ATTR}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  wallet: `<svg ${SVG_ATTR}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
  compare: `<svg ${SVG_ATTR}><path d="M6 9a6 6 0 0 0 12 0V3H6z"/><path d="M6 5H3v2a3 3 0 0 0 3 3"/><path d="M18 5h3v2a3 3 0 0 1-3 3"/><path d="M12 15v3"/><path d="M8 21h8"/><path d="M10 18h4"/></svg>`,
  headphones: `<svg ${SVG_ATTR}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`
};
// 信任背书 badge 图标映射（按 type 区分）
const TRUST_ICON = {
  award: ICON.compare,
  volume: ICON.trend,
  fund: ICON.shield,
  support: ICON.headphones
};
// 各交易所品牌色（用于 award badge 色条 + icon 着色）
const EX_BRAND = {
  binance: '#F0B90B', okx: '#0a0a0a', kucoin: '#24AE8F', bybit: '#F7A600',
  bitget: '#1E88E5', kraken: '#5741D9', coinbase: '#0052FF'
};
// 交易所详情页头部的首选竞品：显式配置，避免受 EX 数据插入顺序影响。
const EX_PRIMARY_COMPARE = Object.freeze({
  binance: 'okx',
  okx: 'binance',
  bybit: 'bitget',
  bitget: 'bybit',
  kucoin: 'binance',
  kraken: 'coinbase',
  coinbase: 'kraken'
});
// 导航下拉箭头（chevron-down，hover 旋转 180°）
const CHEV = `<svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
// 交易所下拉 logo：品牌色 + 字母（自画简化标识，避免 CDN/版权）
const EX_LOGO = {
  binance:  `<svg class="ex-logo" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#F0B90B"/><text x="9" y="13" font-size="10" font-weight="700" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" fill="#000">B</text></svg>`,
  okx:      `<svg class="ex-logo" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#0a0a0a"/><text x="9" y="13" font-size="9" font-weight="700" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" fill="#fff">OK</text></svg>`,
  kucoin:   `<svg class="ex-logo" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#24AE8F"/><text x="9" y="13" font-size="10" font-weight="700" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" fill="#fff">K</text></svg>`,
  bybit:    `<svg class="ex-logo" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#F7A600"/><text x="9" y="13" font-size="10" font-weight="700" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" fill="#000">B</text></svg>`,
  bitget:   `<svg class="ex-logo" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#1E88E5"/><text x="9" y="13" font-size="10" font-weight="700" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" fill="#fff">B</text></svg>`,
  kraken:   `<svg class="ex-logo" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#5741D9"/><text x="9" y="13" font-size="10" font-weight="700" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" fill="#fff">K</text></svg>`,
  coinbase: `<svg class="ex-logo" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#0052FF"/><text x="9" y="13" font-size="10" font-weight="700" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" fill="#fff">C</text></svg>`
};
// 中文本地化：VIP 档位名翻译（en 直接用原名）
const TIER_ZH_MAP = { 'Regular': '普通用户', 'Standard': '标准', 'Pro 4': '专业 4 级', 'Pro 5': '专业 5 级' };
// 中文本地化：入金方式翻译（品牌名 Apple Pay/Google Pay/PayPal/Bpay 保留）
const DEP_ZH_MAP = { 'Bank transfer': '银行转账', 'Credit/Debit card': '信用卡/借记卡', 'Wire transfer': '电汇', 'P2P': 'C2C' };
function trZh(en, map) { return map[en] || en; }

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
let COIN_SNAPSHOT = '';
const coinJsonPath = path.join(dataDir, 'coins.json');
if (fs.existsSync(coinJsonPath)) {
  const cj = JSON.parse(fs.readFileSync(coinJsonPath, 'utf8'));
  COVERAGE_MODE = cj.meta.coverage_mode;
  COIN_SNAPSHOT = (cj.meta.generated_at || '').slice(0, 10);
  UPD = COIN_SNAPSHOT; // 数据快照时间统一用 coins.json 的时间（保证每日新鲜）
  COIN_LIST = cj.coins.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    rank: c.rank,
    price: c.price,
    market_cap: c.market_cap,
    category: c.category || 'other',
    cg_id: c.cg_id || '',
    change_24h: c.change_24h != null ? c.change_24h : null,
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
    navZh: '中文',
    navTools: 'Tools', navExchanges: 'Exchanges', navCompare: 'Compare', navLearn: 'Learn',
    navTc: 'Spot Toolbox', navFut: 'Futures Toolbox', navCmp: 'Comparison', navGlo: 'Glossary', navSec: 'Token Check', navPf: 'Portfolio',
    discHtml: '<div class="note" style="text-align:left"><p style="margin:0 0 4px">① Fee snapshot: {SNAPSHOT} — verify each rate on the exchange\'s official page before trading.</p><p style="margin:0">② Compliance varies by exchange — always check each exchange\'s Terms of Use to confirm your country/region is supported before signing up.</p></div>',
    foot: 'Educational only. Not financial advice. Verify all data on official exchange pages. Data snapshot ', footContact: 'For feature requests or bug reports, contact ',
    footPrivacy: 'Privacy', footTerms: 'Terms', footAbout: 'About', footHome: 'Home',
    thExchange: 'Exchange', thLists: 'Lists {s}', thTaker: 'Spot taker', thTakerFut: 'Futures taker', thFee20: 'USDT TRC20 fee',
    ctaBuy: 'Buy {s} on {x}', ctaOpen: 'Open KuCoin', ctaOpenOn: 'Open {x}', ctaAcct: 'Open a {x} account',
    alsoOn: '{s} is also available on: {o}. Use the Fee Calculator to compare your exact trade size.',
    priceLine: '{s} price: {p} · Market cap: {m} · Rank #{r} (CoinGecko snapshot {d}).',
    exDeposit: 'Deposit', exFut: 'Futures', exFeat: 'Features',
    wbH1: 'Buy {s}',
    wbIntro: '',
    wbToggle: 'Choose a value in each column',
    wbColDeposit: 'Deposit', wbColSpot: 'Spot fee', wbColFut: 'Futures fee', wbColFeat: 'Features',
    wbTaker: 'Taker', wbMaker: 'Maker', wbCopy: 'Copy', wbBot: 'Bot', wbApi: 'API',
    wbNotesTitle: 'Regional & account notes',
    wbEmpty: 'No exchange listing data is available for {s} yet.',
    wbTitle: 'Where to Buy {s} — Compare Exchanges',
    wbDesc: 'Find where to buy {s} in 2026. Compare listings, spot fees and withdrawal costs across major exchanges.',
    wbQ1: 'Where can I buy {s}?', wbA1: '{s} is listed on major exchanges including KuCoin, subject to regional availability. Compare fees above.',
    exH1: '{n} — {slogan}',
    exH1Default: 'Fees, Networks & Tools (2026)',
    exIntro: 'Snapshot of {n} trading fees, USDT withdrawal costs, supported networks and features. Data {u}.',
    exSpot: 'Spot fee', exFutures: 'Futures fee', exWd: 'USDT withdrawal', exCoins: 'Coins listed', exBot: 'Trading bot', exApi: 'API',
    exOf: '{t} listed', exBotYes: 'Available', exBotNo: 'No',
    exTitle: '{n} — {slogan}',
    exDesc: '{n} fees, USDT withdrawal costs, supported networks and trading features. Compare with other exchanges.',
    exCompare: 'Compare: ',
    exTrust: 'CoinGecko trust score', exSec: 'FeeEye editorial security score', exPor: 'PoR', exCold: 'Cold storage',
    exFeeBlock: 'Trading fees', exTier: 'Tier', exMaker: 'Maker', exTaker: 'Taker', exThreshold: '30d volume', exTokenDisc: 'Pay with {t} saves {r}',
    exSecBlock: 'Security & compliance', exReserve: 'Proof of reserves', exLicenses: 'Licenses', exKyc: 'KYC', exIncident: 'Security history',
    exWdBlock: 'USDT withdrawal fees', exNet: 'Network', exFee: 'Fee', exDepBlock: 'Deposit methods', exMethod: 'Method',
    exCapBlock: 'Trading capabilities', exVolume: '24h volume', exMaxLev: 'Max leverage', exOptions: 'Options', exMargin: 'Margin', exLeveragedTok: 'Leveraged tokens', exCopy: 'Copy trading',
    exNote: 'Fee snapshot — always confirm on the official exchange page. CoinGecko trust scores use CoinGecko\'s exchange methodology. FeeEye editorial security scores synthesize public incident history, reserve disclosures and custody claims; they are comparative indicators, not guarantees of safety.',
    exTrustBlock: 'Trust & recognition', exAwards: 'Media awards', exProtection: 'Protection fund', exSupport: 'Customer support', exVolOfficial: 'Official daily volume',
    exEvent: 'Event', exResponse: 'Response',
    exCapScale: 'Scale & liquidity', exCapDeriv: 'Derivatives', exCapAuto: 'Automation & community',
    cpH1: '{a} vs {b} — Fee & Feature Comparison (2026)',
    cpIntro: 'Side-by-side of trading fees, withdrawal costs and features. Data snapshot {u}.',
    cpTh: 'Feature', cpQ1: '{a} or {b} — which has lower fees?',
    cpA1: 'Spot taker fees: {a} {k} vs {b} {o} (snapshot {u}). Compare full table above.',
    cpTitle: '{a} vs {b} 2026 — Fees & Features Compared',
    cpDesc: '{a} vs {b}: compare spot/futures fees, USDT withdrawal costs and features.',
    fSpotTaker: 'Spot taker', fSpotMaker: 'Spot maker', fFutTaker: 'Futures taker', fWd20: 'USDT TRC20 withdrawal', fWdErc: 'USDT ERC20 withdrawal', fBot: 'Trading bot', fApi: 'API',
    cyH1: 'Best Crypto Exchanges in {n} (2026)',
    cyIntro: 'Compare major exchanges available to residents of {n}, including spot fees and USDT (TRC20) withdrawal costs. Always confirm current eligibility on each exchange — listings and regional access change.',
    cyNote: 'This page lists exchanges that may serve {n} based on published regional availability. It is not legal advice. Complete KYC is required. Residents of {r} are not served.',
    cyTitle: 'Best Crypto Exchanges in {n} 2026 — Fees & Availability',
    cyDesc: 'Compare crypto exchanges available in {n}: spot fees, USDT withdrawal costs and regional availability.',
    cyUse: 'Use the Fee Calculator to compare your exact trade size across these exchanges.',
    idxH1: 'Free Crypto Tools & Exchange Data',
    idxIntro: 'Compare exchange fees, find where to buy a token, and check withdrawal costs — free, no signup.',
    idxTcT: 'Spot base cost', idxTcB: 'Estimate deposit / trading / withdrawal fees, with spread, slippage, FX, and external payment charges clearly excluded.', idxTcC: 'Open tool →',
    idxFutT: 'Futures Toolbox', idxFutB: 'High risk: leveraged trading can liquidate your position and cause rapid losses. Includes position sizing, liquidation price, PnL and fee comparison.', idxFutC: 'Open high-risk tool →',
    idxCmpT: 'Exchange Comparison', idxCmpB: 'Compare 14 business dimensions: leverage, options, coins, liquidity, copy-trading/bots, reserves/cold storage, KYC, licenses, fiat deposits.', idxCmpC: 'Compare 14 dimensions →',
    idxGloT: 'Crypto Glossary', idxGloB: '40+ plain-language definitions of common crypto terms — from spot trading to wallet security.', idxGloC: 'Browse terms →',
    idxSecT: 'Token Security Check', idxSecB: 'Screen an Ethereum or Solana contract for known technical risk flags such as honeypots, taxes, mint and freeze authority. A clean result is not a safety guarantee.', idxSecC: 'Check a token →',
    idxPfT: 'Portfolio Tracker', idxPfB: 'Log your holdings manually and auto-track profit & loss with live prices. No API key needed — data stays in your browser.', idxPfC: 'Track holdings →',
    idxPopular: 'Popular tokens',
    idxTitle: 'FeeEye — Free Crypto Fee Calculator & Exchange Data',
    idxDesc: 'Free crypto tools: compare exchange fees, find where to buy tokens, check withdrawal costs. No signup.'
  },
  zh: {
    navZh: 'English',
    navTools: '工具', navExchanges: '交易所', navCompare: '对比', navLearn: '学习',
    navTc: '现货工具', navFut: '合约工具', navCmp: '综合对比', navGlo: '术语', navSec: '代币检查', navPf: '持仓记账',
    discHtml: '<div class="note" style="text-align:left"><p style="margin:0 0 4px">① 费率快照：最近更新 {SNAPSHOT}—— 交易前请以各交易所官方页面为准。</p><p style="margin:0">② 合规受限地区因交易所而异——注册前请查各所 Terms of Use 确认你所在国家/地区可用。</p></div>',
    foot: '仅供教育参考，不构成投资建议。请以各交易所官方页面核实所有数据。数据快照 ', footContact: '如有任何功能需求和建议，或网页有错误需要修正，请联系 ',
    footPrivacy: '隐私政策', footTerms: '使用条款', footAbout: '关于我们', footHome: '首页',
    thExchange: '交易所', thLists: '上架 {s}', thTaker: '现货吃单费率', thTakerFut: '合约吃单费率', thFee20: 'USDT TRC20 提币费',
    ctaBuy: '在 {x} 购买 {s}', ctaOpen: '打开 KuCoin', ctaOpenOn: '打开 {x}', ctaAcct: '注册 {x} 账户',
    alsoOn: '{s} 还可在以下平台购买：{o}。使用手续费计算器对比你的具体交易成本。',
    priceLine: '{s} 价格：{p} · 市值：{m} · 排名 #{r}（CoinGecko 快照 {d}）。',
    exDeposit: '入金', exFut: '合约', exFeat: '能力',
    wbH1: '购买 {s}',
    wbIntro: '',
    wbToggle: '每列下拉可选择查看的项目',
    wbColDeposit: '入金方式', wbColSpot: '现货费率', wbColFut: '合约费率', wbColFeat: '能力',
    wbTaker: '吃单', wbMaker: '挂单', wbCopy: '跟单', wbBot: '机器人', wbApi: 'API',
    wbNotesTitle: '地区与账户提示',
    wbEmpty: '暂未获取到 {s} 的交易所上架数据。',
    wbTitle: '在哪里购买 {s}——交易所对比',
    wbDesc: '查找 2026 年在哪里购买 {s}。对比各大交易所的上架情况、现货费率与提币成本。',
    wbQ1: '我可以在哪里购买 {s}？', wbA1: '{s} 已在多家交易所上架（含 KuCoin），具体取决于地区可用性。请对比上方费率。',
    exH1: '{n}——{slogan}',
    exH1Default: '费率、网络与工具（2026）',
    exIntro: '{n} 交易费率、USDT 提币成本、支持网络与功能快照。数据更新至 {u}。',
    exSpot: '现货费率', exFutures: '合约费率', exWd: 'USDT 提币', exCoins: '上架币种', exBot: '交易机器人', exApi: 'API',
    exOf: '上架 {t} 个', exBotYes: '支持', exBotNo: '不支持',
    exTitle: '{n}——{slogan}',
    exDesc: '{n} 费率、USDT 提币成本、支持网络与交易功能。与其他交易所对比。',
    exCompare: '对比：',
    exTrust: 'CoinGecko 信任分', exSec: 'FeeEye 编辑安全分', exPor: '储备证明', exCold: '冷存储',
    exFeeBlock: '交易费率', exTier: '档位', exMaker: '挂单', exTaker: '吃单', exThreshold: '30 天交易量', exTokenDisc: '用 {t} 支付省 {r}',
    exSecBlock: '安全与合规', exReserve: '储备证明', exLicenses: '牌照', exKyc: 'KYC', exIncident: '安全历史',
    exWdBlock: 'USDT 提币费', exNet: '网络', exFee: '费用', exDepBlock: '入金方式', exMethod: '方式',
    exCapBlock: '交易能力', exVolume: '24h 交易量', exMaxLev: '最大杠杆', exOptions: '期权', exMargin: '保证金', exLeveragedTok: '杠杆代币', exCopy: '跟单',
    exNote: '费率为快照值，交易前请以官方页面为准。CoinGecko 信任分采用 CoinGecko 交易所方法；FeeEye 编辑安全分综合公开安全事件、储备披露和托管声明，只用于比较，不代表安全保证。',
    exTrustBlock: '信任背书', exAwards: '媒体奖项', exProtection: '保护基金', exSupport: '客服支持', exVolOfficial: '官方日交易量',
    exEvent: '事件', exResponse: '处理方式',
    exCapScale: '规模与流动性', exCapDeriv: '衍生品', exCapAuto: '自动化与社区',
    cpH1: '{a} vs {b}——费率与功能对比（2026）',
    cpIntro: '交易费率、提币成本与功能并列对比。数据快照 {u}。',
    cpTh: '功能', cpQ1: '{a} 还是 {b}——哪家费率更低？',
    cpA1: '现货吃单费率：{a} {k} vs {b} {o}（快照 {u}）。请对比上方完整表格。',
    cpTitle: '{a} vs {b} 2026——费率与功能对比',
    cpDesc: '{a} vs {b}：对比现货/合约费率、USDT 提币成本与功能。',
    fSpotTaker: '现货吃单', fSpotMaker: '现货挂单', fFutTaker: '合约吃单', fWd20: 'USDT TRC20 提币', fWdErc: 'USDT ERC20 提币', fBot: '交易机器人', fApi: 'API',
    cyH1: '{n} 最佳加密货币交易所（2026）',
    cyIntro: '对比 {n} 居民可用的主流交易所，包括现货费率与 USDT（TRC20）提币成本。各交易所的地区可用性与上架情况会变化，请始终确认最新状态。',
    cyNote: '本页基于公开的地区可用性列出可能服务 {n} 的交易所，不构成法律意见。需完成 KYC。{r} 等受限地区居民不适用。',
    cyTitle: '{n} 最佳加密货币交易所 2026——费率与可用性',
    cyDesc: '对比 {n} 可用的加密货币交易所：现货费率、USDT 提币成本与地区可用性。',
    cyUse: '使用手续费计算器对比你在这些交易所的具体交易成本。',
    idxH1: '免费加密货币工具与交易所数据',
    idxIntro: '对比交易所费率、查找代币在哪里购买、查看提币成本——免费、无需注册。',
    idxTcT: '现货基础成本', idxTcB: '估算入金 / 交易 / 提币的基础费用，并明确提示价差、滑点与外部支付费用不在结果内。', idxTcC: '打开工具 →',
    idxFutT: '合约工具箱', idxFutB: '高风险：杠杆交易可能快速亏损并被强平。包含仓位、强平价、盈亏和费率对比工具。', idxFutC: '打开高风险工具 →',
    idxCmpT: '交易所综合对比', idxCmpB: '14 个业务维度对比交易所：杠杆/期权/流动性/币种/跟单/储备/法币入金等。', idxCmpC: '14 维度对比 →',
    idxGloT: '数字货币术语解释', idxGloB: '40+ 数字货币常用术语通俗解释，从现货交易到钱包安全全覆盖。', idxGloC: '查术语 →',
    idxSecT: '代币安全检查', idxSecB: '检查以太坊或 Solana 合约中已知的技术风险标记，如貔貅盘、买卖税、增发和冻结权限。未报警不代表代币安全。', idxSecC: '查一个代币 →',
    idxPfT: '持仓记账本', idxPfB: '手动记录你的持仓，自动拉取实时价格算盈亏。无需 API Key，数据只存在浏览器本地。', idxPfC: '记一笔持仓 →',
    idxPopular: '热门代币',
    idxTitle: 'FeeEye——免费加密货币费率计算器与交易所数据',
    idxDesc: '免费加密货币工具：对比交易所费率、查找代币在哪里购买、查看提币成本。无需注册。',
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

function matchActiveNav(path) {
  if (!path) return null;
  if (/exchanges\//.test(path)) return 'ex';
  if (/compare\//.test(path) && !/exchange-comparator/.test(path)) return 'cp';
  if (/glossary/.test(path)) return 'glo';
  if (/total-cost-calculator|fee-calculator/.test(path)) return 'tc';
  if (/futures-toolbox/.test(path)) return 'fut';
  if (/exchange-comparator/.test(path)) return 'cmp';
  if (/token-security-checker/.test(path)) return 'sec';
  if (/portfolio-tracker/.test(path)) return 'pf';
  return null;
}
// 工具页：zh 用中文版，en 用英文版
function toolPath(lang) {
  return 'tools/fee-calculator' + (lang === 'zh' ? '.zh' : '') + '.html';
}
function tcPath(lang) {
  return 'tools/total-cost-calculator' + (lang === 'zh' ? '.zh' : '') + '.html';
}
function cmpPath(lang) {
  return 'tools/exchange-comparator' + (lang === 'zh' ? '.zh' : '') + '.html';
}
function futPath(lang) {
  return 'tools/futures-toolbox' + (lang === 'zh' ? '.zh' : '') + '.html';
}
function gloPath(lang) {
  return 'tools/glossary' + (lang === 'zh' ? '.zh' : '') + '.html';
}
function secPath(lang) {
  return 'tools/token-security-checker' + (lang === 'zh' ? '.zh' : '') + '.html';
}
function pfPath(lang) {
  return 'tools/portfolio-tracker' + (lang === 'zh' ? '.zh' : '') + '.html';
}

// ---- 合规页面（Privacy / Terms / Affiliate Disclosure）----
const LEGAL_HTML = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      desc: 'How FeeEye handles your information.',
      body: `<h1>Privacy Policy</h1><p class="intro">Last reviewed: 2026-08-20</p><h3>Who we are</h3><p>This policy describes how FeeEye ("we", "us") handles information on this website.</p><h3>Accounts and tool inputs</h3><p>We don\'t require accounts and we don\'t ask for names or email addresses. Inputs entered into calculators and the portfolio tracker stay in your browser and are not sent to FeeEye servers.</p><h3>Analytics status</h3><p>FeeEye currently does not load an analytics beacon or custom-event tracker. We may enable privacy-conscious aggregate analytics in the future to measure page views, performance and a limited set of product interactions. Before activation, we will update this policy to identify the provider, data fields and applicable storage practices. We will not send complete search queries, wallet addresses, portfolio inputs or calculator amounts as analytics events.</p><h3>External services</h3><p>Token checks and live-price features may request data from the named third-party APIs when you use those tools. Opening an exchange link takes you to that exchange, whose privacy policy then applies.</p><h3>Changes</h3><p>We will update this policy and the "last reviewed" date when practices change.</p>`,
    },
    terms: {
      title: 'Terms of Use',
      desc: 'The terms that govern use of FeeEye.',
      body: `<h1>Terms of Use</h1><p class="intro">Last reviewed: 2026-08-14</p><h3>Acceptance</h3><p>By using this website you agree to these terms. If you do not agree, do not use the site.</p><h3>Not financial advice</h3><p>All content (fee calculators, comparisons, data, articles) is <b>educational/informational only</b> and is <b>not</b> financial, investment, legal, or tax advice. Crypto involves substantial risk; you may lose your entire capital. Consult a qualified professional.</p><h3>No warranty on data</h3><p>Fee, withdrawal, network, and availability data is provided as a snapshot and may be outdated or inaccurate. <b>Always verify on each exchange's official sources before acting.</b> We disclaim liability for decisions based on this site.</p><h3>Intellectual property</h3><p>Site content, design, and data compilations are owned by FeeEye unless stated. You may not republish large portions without permission.</p><h3>Limitation of liability</h3><p>To the maximum extent permitted by law, we are not liable for any loss arising from use of this site.</p><h3>Governing law</h3><p>These terms are governed by the laws of the jurisdiction where the operator is established, excluding conflict-of-law rules.</p><h3>Contact</h3><p><a class="mail" href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p>`
    },
    disclosure: {
      title: 'Affiliate Disclosure',
      desc: 'How FeeEye earns from affiliate links.',
      body: `<h1>Affiliate Disclosure</h1><p class="intro">Last reviewed: 2026-08-14</p><h3>Our affiliate relationship</h3><p>This website participates in affiliate / referral programs of the cryptocurrency exchanges listed below (collectively, "Partners"):</p><ul><li><b>KuCoin</b> — referral/affiliate link: <code>https://www.kucoin.com/r/af/HODL100</code></li><li><b>Binance</b> — referral link: <code>https://www.binance.com/register?ref=BTCANDSOL</code></li><li><b>OKX</b> — referral link: <code>https://www.okx.com/account/register?channelid=1897959</code></li><li>Bybit, Bitget, Kraken, Coinbase — informational comparison only; affiliate links added where a program is joined.</li></ul><p>When you click an affiliate link and open an account or trade, we may receive a commission from the Partner <b>at no additional cost to you</b>.</p><h3>How links are marked</h3><p>All affiliate links on this site carry the HTML attribute <code>rel="sponsored nofollow"</code> so they are not presented as editorial endorsements.</p><h3>No extra cost</h3><p>Any commission we earn is paid by the exchange out of its own fee revenue. Your trading fees are <b>not</b> increased by using our links.</p><h3>Not financial advice</h3><p>Nothing on this site is financial, investment, legal, or tax advice. Fee comparisons are informational only. Always verify current fees on each exchange's official fee schedule before trading.</p><h3>Independence</h3><p>We aim to present data objectively. Where a comparison might be influenced by affiliate relationships, we disclose it. We do <b>not</b> recommend an exchange solely because it pays a higher commission.</p><h3>Contact</h3><p>Questions about this disclosure: <a href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p>`
    }
  },
  zh: {
    privacy: {
      title: '隐私政策',
      desc: 'FeeEye 如何处理你的信息。',
      body: `<h1>隐私政策</h1><p class="intro">最近审阅：2026-08-20</p><h3>账号与工具输入</h3><p>FeeEye 不要求注册账号，也不主动索取姓名或邮箱。费用计算器和持仓记账本中的输入保留在你的浏览器中，不发送到 FeeEye 服务器。</p><h3>分析功能状态</h3><p>FeeEye 当前没有加载网站分析 Beacon 或自定义事件统计脚本。未来可能启用注重隐私的汇总分析，用于衡量页面访问、性能和少量产品交互；启用前会更新本政策，明确服务提供方、数据字段和存储方式。完整搜索词、钱包地址、持仓输入和计算器金额不会作为分析事件发送。</p><h3>外部服务</h3><p>使用代币检查和实时价格功能时，页面可能向工具中标明的第三方 API 请求数据。打开交易所链接后，将适用该交易所的隐私政策。</p><h3>变更</h3><p>实践发生变化时，我们会更新本政策及"最近审阅"日期。</p>`,
    },
    terms: {
      title: '使用条款',
      desc: '规范 FeeEye 使用的条款。',
      body: `<h1>使用条款</h1><p class="intro">最近审阅：2026-08-14</p><h3>接受</h3><p>使用本网站即表示你同意这些条款。若不同意，请勿使用本网站。</p><h3>非财务建议</h3><p>本站全部内容（费率计算器、对比、数据、文章）<b>仅供教育/信息参考</b>，<b>不构成</b>财务、投资、法律或税务建议。加密货币风险极高，你可能损失全部本金。请咨询合格专业人士。</p><h3>数据不作保证</h3><p>费率、提币、网络与可用性数据以快照形式提供，可能过时或不准确。<b>请在操作前务必以各交易所官方来源核实。</b>我们对基于本站做出的决策不承担责任。</p><h3>知识产权</h3><p>除非另有说明，网站内容、设计与数据汇编归 FeeEye 所有。未经许可不得大量转载。</p><h3>责任限制</h3><p>在法律允许的最大范围内，我们对因使用本网站产生的任何损失不承担责任。</p><h3>管辖法律</h3><p>本条款受运营方所在地司法辖区法律管辖（排除法律冲突规则）。</p><h3>联系方式</h3><p><a href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p>`
    },
    disclosure: {
      title: '返佣披露',
      desc: 'FeeEye 如何通过返佣链接获得收入。',
      body: `<h1>返佣披露</h1><p class="intro">最近审阅：2026-08-14</p><h3>我们的返佣关系</h3><p>本网站参与以下加密货币交易所的返佣/推荐计划（统称"合作伙伴"）：</p><ul><li><b>KuCoin</b> — 返佣链接：<code>https://www.kucoin.com/r/af/HODL100</code></li><li><b>Binance</b> — 推荐链接：<code>https://www.binance.com/register?ref=BTCANDSOL</code></li><li><b>OKX</b> — 推荐链接：<code>https://www.okx.com/account/register?channelid=1897959</code></li><li>Bybit、Bitget、Kraken、Coinbase — 仅信息对比；加入相应计划后再添加返佣链接。</li></ul><p>当你点击返佣链接并开户或交易时，我们可能从合作伙伴处获得佣金，<b>不会给你带来额外成本</b>。</p><h3>链接如何标注</h3><p>本站所有返佣链接均带 <code>rel="sponsored nofollow"</code> 属性，不会伪装成编辑推荐。</p><h3>无额外成本</h3><p>我们获得的任何佣金均由交易所从其自有手续费收入中支付。使用我们的链接<b>不会</b>提高你的交易手续费。</p><h3>非财务建议</h3><p>本站任何内容均非财务、投资、法律或税务建议。费率对比仅供参考，交易前请务必在交易所官方费率表核实。</p><h3>独立性</h3><p>我们力求客观呈现数据。若对比可能受返佣关系影响，我们会予以披露。我们<b>不会</b>仅因某交易所佣金更高而推荐它。</p><h3>联系方式</h3><p>关于本披露的问题：<a href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p>`
    }
  }
};

function legalPage(key, lang) {
  const c = LEGAL_HTML[lang][key];
  const rel = `${lang === 'zh' ? 'zh/' : ''}${key}.html`;
  return page({ lang, title: c.title, desc: c.desc, body: c.body, path: rel, affiliate: false, noDisc: true });
}

// About / Contact 页面
const ABOUT_HTML = {
  en: {
    title: 'About FeeEye — Free Crypto Tools & Exchange Data',
    desc: 'What FeeEye is, the free tools we offer, how we make money, and how to contact us.',
      body: `<h1>About FeeEye</h1><p class="intro">Free crypto tools &amp; exchange data — built for beginners.</p><h3>What we do</h3><p>FeeEye is a free website that helps beginners understand exchange costs, availability and common technical risks. The site does not require an account.</p><h3>How comparisons are produced</h3><p>Fee and availability fields are snapshots from exchange publications and public market-data sources. CoinGecko trust scores are shown as CoinGecko metrics. FeeEye editorial security scores synthesize public incident history, reserve disclosures and custody claims. They are comparative indicators, not safety guarantees. Every material decision should be checked against the exchange\'s current official terms and fee screen.</p><h3>Our tools</h3><ul><li><b>Spot Toolbox</b> — estimate deposit, trading and withdrawal costs.</li><li><b>Futures Toolbox</b> — high-risk educational calculations for position sizing, liquidation and P&amp;L.</li><li><b>Exchange Comparison</b> — compare 14 published dimensions side by side.</li><li><b>Token Security Check</b> — screen for known technical risk flags; a clean result is not a safety guarantee.</li><li><b>Portfolio Tracker</b> — log holdings and track profit &amp; loss without an API key.</li><li><b>Crypto Glossary</b> — plain-language definitions of common crypto terms.</li></ul><h3>Corrections and contact</h3><p>Questions, source corrections or bug reports: <a href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p><h3>Disclaimer</h3><p>FeeEye is educational only — not financial advice. Crypto is high-risk and you may lose your capital. Always do your own research and verify data on official exchange pages.</p>`
  },
  zh: {
    title: '关于 FeeEye — 免费加密货币工具与交易所数据',
    desc: 'FeeEye 是什么、提供的免费工具、如何盈利、以及联系方式。',
    body: `<h1>关于 FeeEye</h1><p class="intro">免费加密货币工具与交易所数据——为新手打造。</p><h3>我们做什么</h3><p>FeeEye 帮助新手理解交易所成本、可用性和常见技术风险。网站免费，无需注册。</p><h3>对比方法</h3><p>费率和地区可用性为交易所公开资料及公开市场数据的快照。CoinGecko 信任分为 CoinGecko 指标；FeeEye 编辑安全分综合公开安全事件、储备披露和托管声明，只用于比较，不代表安全保证。重要决定前请以交易所当前条款和费率页为准。</p><h3>我们的工具</h3><ul><li><b>现货工具箱</b>——估算入金、交易和提币基础成本。</li><li><b>合约工具箱</b>——高风险的仓位、强平价与盈亏教育计算。</li><li><b>交易所综合对比</b>——比较 14 个公开维度。</li><li><b>代币安全检查</b>——筛查已知技术风险标记，未报警不代表安全。</li><li><b>持仓记账本</b>——记录持仓、追踪盈亏，无需 API Key。</li><li><b>数字货币术语解释</b>——常用术语通俗解释。</li></ul><h3>更正与联系</h3><p>数据更正、问题反馈或 bug 报告：<a href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p><h3>免责声明</h3><p>FeeEye 仅供教育参考，不构成投资建议。加密货币风险极高，你可能损失全部本金。请自行做好研究，并以交易所官方页面核实数据。</p>`
  }
};

function aboutPage(lang) {
  const c = ABOUT_HTML[lang];
  const rel = `${lang === 'zh' ? 'zh/' : ''}about.html`;
  return page({ lang, title: c.title, desc: c.desc, body: c.body, path: rel, affiliate: false, noDisc: true });
}

// 把 GoPlus 安全数据浓缩为 6 个风险等级（首页 coins 列表过滤用）
// ---- 币种列表页（全部币种 + 搜索过滤）----
function coinsPage(lang) {
  const zh = lang === 'zh';
  const title = zh ? '全部币种 — 在哪里购买' : 'All Coins — Where to Buy';
  const desc = zh ? `浏览全部追踪币种，搜索并找到每个币在哪里买。` : `Browse all tracked coins and find where to buy each.`;
  const items = [...COIN_LIST].sort((a, b) => a.rank - b.rank)
    .map((c) => `<a class="pill" data-sym="${c.symbol.toLowerCase()}" href="${lang === 'zh' ? '/zh/' : '/'}where-to-buy/${c.symbol.toLowerCase()}.html">${esc(c.name)} (${esc(c.symbol)})</a>`)
    .join('');
  const body = `
  <h1>${zh ? '全部币种' : 'All Coins'}</h1>
  <p class="intro">${zh ? `点击任意币查看在哪些交易所可以买到。` : `Click any coin to see where to buy it.`}</p>
  <input type="search" id="coinSearch" placeholder="${zh ? '搜索币种（如 BTC、PEPE）…' : 'Search coins (e.g. BTC, PEPE)…'}" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-size:15px;margin-bottom:14px">
  <div class="pills" id="coinList">${items}</div>
  <script>
  (function(){
    var input = document.getElementById('coinSearch');
    var list = document.getElementById('coinList');
    input.addEventListener('input', function(){
      var q = input.value.trim().toLowerCase();
      var pills = list.querySelectorAll('.pill');
      pills.forEach(function(p){
        var sym = (p.getAttribute('data-sym') || '') + ' ' + p.textContent.toLowerCase();
        p.style.display = (!q || sym.indexOf(q) > -1) ? '' : 'none';
      });
    });
  })();
  </script>`;
  return page({ lang, title, desc, body, path: `${lang === 'zh' ? 'zh/' : ''}coins.html`, affiliate: false, noDisc: true });
}

// 生成规范 URL 路径：去 .html + index.html → 根 /（对齐 Cloudflare Pages 的 308 重定向目标）
function canonPath(p) {
  return p.replace(/\.html$/, '').replace(/(^|\/)index$/, '$1');
}

function page({ lang, title, desc, body, jsonLd, depth = 0, path, affiliate = false, noDisc = false, noHomeFoot = false, noIndex = false }) {
  const active = matchActiveNav(path);
  const i = I18N[lang];
  // canonical 指向 Cloudflare Pages 308 重定向后的目标 URL（去 .html，且 index.html → 根 /）
  // 避免 Google Search Console 报「网页会自动重定向」+「备用网页」
  const canonicalPath = canonPath(path);
  const canonical = `${SITE_URL}/${canonicalPath}`;
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  // 仅在显式传 noDisc 时才隐藏（如首页/legal/about/coins 等纯信息页）
  const discLine = noDisc ? '' : i.discHtml.replace(/\{SNAPSHOT\}/g, COIN_SNAPSHOT);
  // 导航下拉内容：交易所 7 所 + 对比 6 组（Binance 基准）
  const exPriority = ['binance', 'okx', 'kucoin'];
  const exOrder = [...exPriority, ...Object.keys(EX).filter((s) => !exPriority.includes(s)).sort()];
  const exLinks = exOrder.map((s) => `<a href="${absPath(lang, 'exchanges/' + s + '.html')}">${EX_LOGO[s] || ICON.coins}<span>${esc(EX[s].name)}</span></a>`).join('');
  const cmpPairs = exOrder.filter((s) => s !== 'binance').map((s) => `<a href="${absPath(lang, 'compare/binance-vs-' + s + '.html')}">${ICON.compare}<span>Binance vs ${esc(EX[s].name)}</span></a>`).join('');
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noIndex ? '<meta name="robots" content="noindex, follow">' : ''}
<link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">
<link rel="stylesheet" href="/assets/responsive.css">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${SITE_URL}/${canonPath(lang === 'zh' ? path.replace(/^zh\//, '') : path)}">
${lang === 'zh' ? `<link rel="alternate" hreflang="zh" href="${canonical}">` : `<link rel="alternate" hreflang="zh" href="${SITE_URL}/zh/${canonPath(path)}">`}
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE_URL}/assets/og-logo.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE_URL}/assets/og-logo.png">
${ld}
<style>
:root{--bg:#f7f8fa;--card:#fff;--ink:#1c2430;--sub:#5b6776;--line:#e4e8ee;--brand:#2563eb;--brand2:#0ea5a4;--ok:#16a34a;--bad:#dc2626}
html{scrollbar-gutter:stable}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.65;font-size:15px}
.wrap{max-width:880px;margin:0 auto;padding:22px 18px 60px}
.topbar{display:flex;align-items:flex-start;gap:24px;flex-wrap:nowrap;padding:0 0 8px;margin:2px 0 14px;border-bottom:1px solid var(--line)}
.topbar .logo{display:flex;align-items:center;gap:8px;flex-shrink:0;color:var(--brand);font-weight:800;font-size:20px;text-decoration:none}
.topbar .logo img{height:30px;width:30px;display:block}
.nav{flex:1;display:flex;gap:20px;align-items:center;flex-wrap:nowrap;justify-content:center;line-height:1;min-height:0;height:auto;margin-top:12px}
.nav a{color:#1e293b;text-decoration:none;font-size:14px;line-height:1;white-space:nowrap;border-bottom:2px solid transparent;padding-bottom:2px;display:inline-flex;align-items:center;font-weight:500;gap:6px}
.nav a:hover{color:var(--brand);border-bottom-color:var(--brand)}
.nav a.active{color:var(--brand);border-bottom:2px solid var(--brand);font-weight:600}
.nav a svg{width:16px;height:16px;flex-shrink:0;color:var(--brand)}
.nav-item{position:relative}
.nav-btn{background:none;border:none;color:#1e293b;font-size:14px;line-height:1;white-space:nowrap;padding:0 0 2px;cursor:pointer;border-bottom:2px solid transparent;font-family:inherit;font-weight:500;display:inline-flex;align-items:center;gap:4px}
.nav-btn .chev{transition:transform .2s ease;flex-shrink:0}
.nav-item:hover .chev,.nav-item.open .chev{transform:rotate(180deg)}
.nav-btn:hover{color:var(--brand);border-bottom-color:var(--brand)}
.nav-btn.active{color:var(--brand);border-bottom:2px solid var(--brand);font-weight:600}
.dropdown{display:none;position:absolute;top:100%;left:50%;transform:translateX(-50%);background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 32px rgba(15,23,42,.14);z-index:200;min-width:170px;padding:6px;white-space:nowrap;margin-top:0;padding-top:10px;opacity:0;transition:opacity .15s ease}
.nav-item:hover .dropdown,.nav-item.open .dropdown{display:block;opacity:1}
.dropdown::before{content:\"\";position:absolute;left:0;right:0;top:-10px;height:10px;background:transparent}
.dropdown a{display:flex;align-items:center;gap:8px;padding:7px 12px;color:#1e293b;font-size:13.5px;border-radius:7px;border-bottom:none;text-decoration:none}
.dropdown a svg{width:16px;height:16px;flex-shrink:0;color:var(--brand)}
.dropdown a:hover{background:#f1f5f9;color:var(--brand);box-shadow:inset 3px 0 0 var(--brand)}
.topbar>span{flex-shrink:0;padding-right:30px;padding-top:6px}
.topbar>span>a{color:var(--sub);text-decoration:none;font-size:13.5px;line-height:1;white-space:nowrap}
h1{font-size:25px;margin-bottom:6px}
h3{margin-top:22px;font-size:18px}
.intro{color:var(--sub);margin-bottom:18px}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
th,td{border:1px solid var(--line);padding:10px 12px;text-align:center}
th{background:#f1f5f9;font-weight:600;white-space:nowrap}
tr.kc{background:#eef4ff}
.cta{display:inline-block;background:var(--brand);color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;min-height:36px;text-align:center;min-width:11.5rem}
.cta:hover{opacity:.9}
.num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
input[type=number]{font-size:16px}
.na{color:var(--bad);font-weight:600}
.best{color:var(--ok);font-weight:700}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
.beginner-path{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 16px;margin:0 0 18px}
.beginner-path b{display:block;margin-bottom:6px;color:#1e3a8a}
.beginner-path ol{margin:0 0 0 20px;color:#334155}
.beginner-path a{color:var(--brand);font-weight:600;text-decoration:none}
.risk-tag{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-size:11px;vertical-align:2px}
.coin-search{position:relative;margin:0 0 18px;z-index:20}
.coin-search-row{display:flex;gap:8px;align-items:stretch}
.coin-search-field{position:relative;flex:1;min-width:0}
.coin-search-field svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:19px;height:19px;color:#64748b;pointer-events:none}
.coin-search-input{width:100%;height:48px;padding:0 42px;border:1px solid var(--line);border-radius:11px;background:#fff;color:#172033;font:inherit;font-size:15px;outline:none;transition:border-color .15s,box-shadow .15s}
.coin-search-input:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.coin-search-input[aria-invalid="true"]{border-color:var(--bad)}
.coin-search-clear{display:none;position:absolute;right:9px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:#64748b;font-size:20px;line-height:1;cursor:pointer}
.coin-search-clear:hover{background:#f1f5f9;color:#172033}
.coin-search-submit{height:48px;background:var(--brand);color:#fff;border:0;padding:0 22px;border-radius:11px;font:inherit;font-size:14px;font-weight:750;cursor:pointer;white-space:nowrap}
.coin-search-submit:hover{background:#1d4ed8}
.coin-suggestions{display:none;position:absolute;left:0;right:0;top:56px;z-index:50;max-height:340px;overflow-y:auto;background:#fff;border:1px solid var(--line);border-radius:12px;padding:6px;box-shadow:0 16px 38px rgba(15,23,42,.16)}
.coin-suggestions.open{display:block}
.coin-suggestion{width:100%;display:grid;grid-template-columns:34px 64px minmax(0,1fr) auto;align-items:center;gap:10px;border:0;border-radius:9px;background:#fff;padding:8px 10px;text-align:left;color:#172033;font:inherit;cursor:pointer}
.coin-suggestion:hover,.coin-suggestion.active{background:#eff6ff}
.coin-suggestion-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:850;letter-spacing:-.02em}
.coin-suggestion-icon.cat-l1{background:#dbeafe;color:#1d4ed8}.coin-suggestion-icon.cat-meme{background:#fef3c7;color:#a16207}.coin-suggestion-icon.cat-exchange{background:#dcfce7;color:#047857}.coin-suggestion-icon.cat-defi{background:#ede9fe;color:#6d28d9}.coin-suggestion-icon.cat-rwa{background:#fce7f3;color:#be185d}
.coin-suggestion-symbol{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;font-weight:800;color:#1d4ed8}
.coin-suggestion-name{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.coin-suggestion-action{font-size:11px;color:#64748b}
.coin-search-hint{padding:7px 10px 5px;color:#64748b;font-size:11px;font-weight:650}
.coin-search-empty{padding:18px 12px;text-align:center;color:#475569;font-size:13px}.coin-search-empty b{display:block;color:#172033;margin-bottom:3px}.coin-search-empty span{font-size:11.5px;color:#64748b}
.search-msg{display:none;color:var(--bad);font-size:13px;margin:7px 2px 0}
@media(max-width:520px){.coin-search-submit{padding:0 16px}.coin-suggestion{grid-template-columns:32px 54px minmax(0,1fr)}.coin-suggestion-action{display:none}.coin-suggestions{max-height:280px}}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.tbadges{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 6px}
.tbadge{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:6px 12px;text-align:center;min-width:84px}
.tbadge span{display:block;font-size:11px;color:var(--sub)}
.tbadge b{display:block;font-size:14px;color:#1e293b;margin-top:2px}
.fee-panel{background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-top:8px}
.fee-tabs{display:flex;gap:6px;margin-bottom:12px}
.ftab{background:#fff;border:1px solid var(--line);border-radius:6px;padding:5px 14px;font-size:13px;cursor:pointer;color:#1e293b;font-family:inherit}
.ftab.active{background:var(--brand);border-color:var(--brand);color:#fff}
.fee-tier{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.fee-tier label{font-size:13px;color:var(--sub)}
.fee-toggle{display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:10px 12px;background:#f8fafc;border:1px solid var(--line);border-radius:8px}
.switch{position:relative;display:inline-block;width:38px;height:22px;cursor:pointer;flex-shrink:0}
.switch input{opacity:0;width:0;height:0;margin:0;position:absolute}
.sl{position:absolute;inset:0;background:#cbd5e1;border-radius:22px;transition:.2s}
.sl::before{content:\"\";position:absolute;width:18px;height:18px;left:2px;top:2px;background:#fff;border-radius:50%;transition:transform .2s}
.switch input:checked+.sl{background:var(--brand)}
.switch input:checked+.sl::before{transform:translateX(16px)}
.switch:has(input:disabled){cursor:not-allowed;opacity:.55}
.disc-label{font-size:13px;color:#1e293b;font-weight:500}
.fee-table{margin:0;font-size:13px}
.fee-table thead th{background:#f1f5f9;font-size:12px;font-weight:600;color:#475569}
.fee-table th:first-child,.fee-table td:first-child{text-align:center}
.fee-table td:nth-child(3),.fee-table td:nth-child(4){color:var(--brand);font-weight:600}
.fee-table tbody tr:nth-child(odd) td{background:#fafbfc}
.sec-list{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:8px}
.srow{display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid var(--line);font-size:13.5px}
.srow:last-child{border-bottom:none}
.srow:nth-child(odd){background:#f8fafc}
.srow span{color:var(--sub)}
.srow b{color:#1e293b;font-weight:500;text-align:right;margin-left:16px}
.cap-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.cap{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:8px 12px}
.cap span{display:block;font-size:11px;color:var(--sub)}
.cap b{display:block;font-size:14px;color:#1e293b;margin-top:2px}
@media(max-width:640px){.cap-grid{grid-template-columns:repeat(2,1fr)}}
.cap-group{margin-top:14px}
.cap-group h4{font-size:13px;color:var(--sub);font-weight:500;margin:0 0 6px 2px;letter-spacing:.02em}
.srow.inc-head{background:#f1f5f9;font-weight:500}
.srow.inc-head span{color:#1e293b}
.srow.inc{padding-left:14px;padding-right:14px}
.srow.inc .inc-event{color:#1e293b;flex:1}
.srow.inc .inc-resp{color:#185FA5;margin-left:12px;font-weight:500;max-width:55%;text-align:right}
.trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:862px;margin:14px auto 18px;grid-auto-rows:minmax(60px,auto);align-items:stretch;white-space:nowrap}
.trust-badge{position:relative;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px 12px 10px 16px;font-size:12.5px;color:#1e293b;line-height:1.4;font-weight:500;box-shadow:0 1px 2px rgba(15,23,42,.04);overflow:hidden;transition:transform .15s ease,box-shadow .15s ease}
.trust-badge::before{content:\"\";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tb-color,var(--line))}
.trust-badge:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,23,42,.08)}
.trust-badge svg{width:18px;height:18px;flex-shrink:0;color:var(--tb-color,var(--sub))}
.tb-text{flex:1;min-width:0}
.trust-badge[data-type="award"]{--tb-color:var(--brand,#64748b);background:#fff}
.trust-badge[data-type="volume"]{--tb-color:#185FA5;background:#f8fbff}
.trust-badge[data-type="fund"]{--tb-color:#16a34a;background:#f6fefa}
.trust-badge[data-type="support"]{--tb-color:#ca8a04;background:#fffdf3}
.trust-badge[data-type="volume"] .tb-text,.trust-badge[data-type="fund"] .tb-text,.trust-badge[data-type="support"] .tb-text{font-weight:600}
@media(max-width:640px){.trust-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:420px){.trust-grid{grid-template-columns:1fr}}
.exchange-page{display:grid;gap:18px}
.exchange-hero{background:linear-gradient(135deg,#fff 0%,#fff 58%,#f8fafc 100%);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:inset 4px 0 0 var(--ex-brand,#64748b),0 8px 28px rgba(15,23,42,.06)}
.exchange-hero-main{display:flex;align-items:flex-start;justify-content:space-between;gap:22px}
.exchange-identity{display:flex;align-items:flex-start;gap:14px;min-width:0}
.exchange-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:var(--ex-brand,#64748b);color:var(--ex-on-brand,#fff);font-size:20px;font-weight:900;box-shadow:inset 0 0 0 1px rgba(15,23,42,.08);flex-shrink:0}
.exchange-eyebrow{font-size:12px;color:#64748b;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:3px}
.exchange-hero h1{font-size:28px;line-height:1.2;margin:0 0 8px}
.exchange-summary{color:#475569;max-width:650px;margin:0;font-size:14px}
.exchange-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0}
.secondary-cta{display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border:1px solid var(--line);border-radius:8px;color:#334155;text-decoration:none;font-size:13px;font-weight:650;background:#fff;white-space:nowrap}
.exchange-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}
.exchange-stat{background:rgba(255,255,255,.9);border:1px solid var(--line);border-radius:10px;padding:11px 12px;min-width:0}
.exchange-stat span{display:block;color:#64748b;font-size:11px;margin-bottom:2px}
.exchange-stat b{display:block;color:#172033;font-size:15px;overflow-wrap:anywhere}
.exchange-stat small{display:block;color:#9a3412;font-size:10.5px;margin-top:2px}
.exchange-nav{display:flex;gap:8px;overflow-x:auto;padding:2px 0 1px;scrollbar-width:thin}
.exchange-nav a{flex:0 0 auto;background:#fff;border:1px solid var(--line);border-radius:999px;padding:7px 12px;color:#475569;text-decoration:none;font-size:12.5px;font-weight:650}
.exchange-nav a:hover{color:var(--brand);border-color:#93c5fd}
.exchange-section{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;scroll-margin-top:12px}
.exchange-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.exchange-section h2{font-size:19px;line-height:1.3;margin:0}
.exchange-section-head p{color:var(--sub);font-size:12.5px;margin:3px 0 0;max-width:660px}
.exchange-fee-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:13px}
.exchange-fee-card{border:1px solid var(--line);border-radius:10px;padding:11px 12px;background:#f8fafc}
.exchange-fee-card span{display:block;color:var(--sub);font-size:11px}
.exchange-fee-card b{display:block;color:#172033;font-size:15px;margin-top:2px}
.exchange-fee-card small{display:block;color:#64748b;font-size:10.5px;margin-top:2px}
.exchange-vip-details{border:1px solid var(--line);border-radius:11px;background:#fbfcfe;overflow:hidden}
.exchange-vip-details summary{cursor:pointer;padding:11px 14px;font-size:13px;font-weight:700;color:#334155;list-style-position:inside}
.exchange-vip-details .fee-panel{margin:0;border:0;border-top:1px solid var(--line);border-radius:0;background:#fff}
.exchange-cap-note{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:12px}
.exchange-cap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.exchange-cap-card{border:1px solid var(--line);border-radius:12px;padding:13px 14px;background:#fff;min-width:0}
.exchange-cap-card.risk{border-color:#fed7aa;background:#fffaf5}
.exchange-cap-top{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:6px}
.exchange-cap-top b{font-size:14px;color:#172033}
.exchange-cap-status{display:inline-flex;align-items:center;border-radius:999px;background:#ecfdf5;color:#047857;padding:2px 7px;font-size:10.5px;font-weight:750;white-space:nowrap}
.exchange-cap-card.risk .exchange-cap-status{background:#ffedd5;color:#c2410c}
.exchange-cap-card p{font-size:12px;color:#64748b;margin:0;line-height:1.55}
.exchange-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.exchange-subcard{border:1px solid var(--line);border-radius:12px;padding:14px;min-width:0;background:#fcfdff}
.exchange-subcard h3{font-size:14px;margin:0 0 3px}
.exchange-subcard>p{font-size:11.5px;color:var(--sub);margin:0 0 8px}
.exchange-subcard table{margin-top:6px;font-size:12.5px}
.exchange-safety-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:12px}
.exchange-checklist{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none}
.exchange-checklist li{position:relative;background:#f8fafc;border:1px solid var(--line);border-radius:9px;padding:10px 11px 10px 32px;font-size:12.5px;color:#334155}
.exchange-checklist li::before{content:"✓";position:absolute;left:11px;top:9px;color:#16a34a;font-weight:800}
.exchange-final{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.exchange-final p{font-size:12px;color:var(--sub);margin:0}
.exchange-evidence{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.exchange-evidence-title{font-size:11px;color:#64748b;font-weight:700;margin-bottom:7px}
.exchange-evidence-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.exchange-evidence-item{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.72);border:1px solid var(--line);border-radius:8px;padding:7px 9px;font-size:10.5px;color:#475569;min-width:0}
.exchange-evidence-item svg{width:15px;height:15px;flex-shrink:0;color:var(--ex-brand,#64748b)}
.exchange-evidence-item span{min-width:0;overflow-wrap:anywhere}
@media(max-width:760px){.exchange-hero-main{display:block}.exchange-actions{justify-content:flex-start;margin-top:14px}.exchange-stats,.exchange-fee-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.exchange-evidence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.exchange-safety-grid{grid-template-columns:1fr}}
@media(max-width:560px){.exchange-hero,.exchange-section{padding:15px}.exchange-hero h1{font-size:23px}.exchange-identity{gap:10px}.exchange-mark{width:44px;height:44px;border-radius:12px}.exchange-cap-grid,.exchange-two-col,.exchange-checklist{grid-template-columns:1fr}.exchange-final{display:block}.exchange-final .cta{margin-top:10px}.exchange-evidence-grid{grid-template-columns:1fr}}
.compare-page{display:grid;gap:16px;min-width:0}
.compare-hero,.compare-section{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;min-width:0}
.compare-hero{background:linear-gradient(135deg,#fff 0%,#f8fbff 100%);box-shadow:0 8px 28px rgba(15,23,42,.05)}
.compare-kicker{font-size:12px;color:var(--brand);font-weight:750;margin-bottom:4px}
.compare-hero h1{font-size:28px;line-height:1.25;margin:0 0 8px;overflow-wrap:anywhere}
.compare-lead{color:#475569;margin:0;max-width:760px}
.compare-guard{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:16px}
.compare-guard div{border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.82);padding:10px 12px}
.compare-guard b{display:block;font-size:12.5px;color:#1e293b}
.compare-guard span{display:block;font-size:11px;color:#64748b;margin-top:2px}
.compare-decider{background:#fff;border:1px solid #bfdbfe;border-radius:16px;padding:20px;box-shadow:0 8px 24px rgba(37,99,235,.06)}
.compare-decider-head h2{font-size:20px;margin:0}.compare-decider-head p{font-size:12.5px;color:#64748b;margin:3px 0 0}
.compare-questions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
.compare-question{display:block;border:1px solid var(--line);border-radius:11px;padding:10px 12px;background:#f8fafc;min-width:0}
.compare-question span{display:block;font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px}
.compare-question select,.compare-question input{width:100%;height:38px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#172033;padding:0 9px;font:inherit;font-size:13px;outline:none}
.compare-question select:focus,.compare-question input:focus{border-color:var(--brand);box-shadow:0 0 0 2px rgba(37,99,235,.1)}
.compare-network-question[hidden]{display:none}
.compare-live-result{margin-top:12px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;padding:14px}
.compare-live-result .eyebrow{font-size:10.5px;color:#1d4ed8;font-weight:800;margin-bottom:3px}
.compare-live-result h3{font-size:18px;line-height:1.35;margin:0;color:#172033}
.compare-live-result>p{font-size:12px;color:#475569;margin:5px 0 0}
.compare-live-result>a{display:inline-block;margin-top:7px;font-size:10.5px;color:#1d4ed8;text-decoration:none}.compare-live-result>a[hidden]{display:none}
.compare-live-table{margin:10px 0 0;font-size:12.5px;background:#fff}.compare-live-table th{font-size:11px;color:#475569}.compare-live-table th:first-child,.compare-live-table td:first-child{text-align:left;font-weight:700;min-width:92px}.compare-live-table td{vertical-align:middle}.compare-live-table td:last-child{color:#475569}.compare-live-table .blocked{color:#b91c1c;font-weight:750}.compare-live-table .better{color:#047857;font-weight:750}
.compare-live-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.compare-live-item{background:#fff;border:1px solid #dbeafe;border-radius:9px;padding:9px 10px;min-width:0}
.compare-live-item span{display:block;font-size:10.5px;color:#64748b}.compare-live-item b{display:block;font-size:12.5px;color:#172033;margin-top:2px;overflow-wrap:anywhere}
.compare-source-links{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
.compare-source-links a{font-size:10.5px;color:#1d4ed8;text-decoration:none;border:1px solid #bfdbfe;background:#eff6ff;border-radius:999px;padding:3px 7px}
.compare-source-links a:hover{text-decoration:underline}
.compare-section h2{font-size:19px;line-height:1.3;margin:0}
.compare-section-head{margin-bottom:12px}
.compare-section-head p{font-size:12.5px;color:#64748b;margin:3px 0 0}
.compare-verdicts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.compare-verdict{border:1px solid var(--line);border-radius:12px;padding:14px;background:#fcfdff;min-width:0}
.compare-verdict .label{font-size:11px;color:#64748b;font-weight:700}
.compare-verdict h3{font-size:16px;line-height:1.35;margin:5px 0 6px;overflow-wrap:anywhere}
.compare-verdict p{font-size:12px;color:#64748b;margin:0;line-height:1.55}
.compare-verdict .winner{display:inline-flex;background:#ecfdf5;color:#047857;border-radius:999px;padding:2px 8px;font-size:10.5px;font-weight:750;margin-top:8px}
.compare-verdict .tie{background:#f1f5f9;color:#475569}
.compare-assumption{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;color:#9a3412;font-size:12px;padding:10px 12px;margin-top:12px}
.compare-section .scroll{max-width:100%;min-width:0}.compare-table td:first-child,.compare-table th:first-child{text-align:left}
.compare-table td b{display:block;color:#172033}.compare-table td small{display:block;color:#64748b;font-size:10.5px;margin-top:2px}
.compare-table .low{color:#047857;font-weight:750;background:#f0fdf4}
.compare-methods{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.compare-method{border:1px solid var(--line);border-radius:12px;padding:13px;background:#fcfdff}
.compare-method h3{font-size:15px;margin:0 0 8px}
.compare-method ul{margin:0;padding-left:18px;color:#475569;font-size:12.5px}
.compare-method li{overflow-wrap:anywhere}.compare-method li+li{margin-top:4px}
.compare-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.compare-fact{border:1px solid var(--line);border-radius:12px;padding:13px;background:#fcfdff}
.compare-fact h3{font-size:15px;margin:0 0 8px}
.compare-fact dl{display:grid;grid-template-columns:110px 1fr;gap:6px 10px;font-size:12.5px}
.compare-fact dt{color:#64748b}.compare-fact dd{margin:0;color:#1e293b;overflow-wrap:anywhere}
.compare-advanced{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffaf5}
.compare-advanced summary{cursor:pointer;padding:12px 14px;font-size:13px;font-weight:750;color:#9a3412}
.compare-advanced .scroll{border-top:1px solid #fed7aa;background:#fff}
.compare-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.compare-actions[hidden],.compare-actions a[hidden]{display:none}
.compare-source-note{font-size:11.5px;color:#64748b;margin:10px 0 0}
@media(max-width:720px){.compare-guard,.compare-verdicts,.compare-live-grid{grid-template-columns:1fr}.compare-methods,.compare-facts{grid-template-columns:1fr}}
@media(max-width:560px){.wrap{width:100%;max-width:100%;overflow-x:hidden}.topbar{gap:7px;flex-wrap:wrap}.topbar .logo{font-size:18px;gap:5px}.topbar .logo img{width:25px;height:25px}.nav{order:2;flex:1 0 100%;width:100%;min-width:0;gap:16px;justify-content:flex-start;overflow-x:auto;padding:2px 0 7px;margin-top:3px}.nav a,.nav-btn{font-size:12.5px}.topbar>span{display:none}.compare-page{width:calc(100vw - 36px);max-width:calc(100vw - 36px);overflow:hidden}.compare-hero,.compare-section,.compare-decider{width:100%;max-width:100%;padding:15px;overflow:hidden}.compare-hero h1{font-size:23px}.compare-questions{grid-template-columns:1fr}.compare-fact dl{grid-template-columns:92px 1fr}.compare-assumption{overflow-wrap:anywhere}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.card a{color:var(--brand);text-decoration:none;font-weight:600}
.card-title{display:inline-block;color:var(--ink);font-weight:700;margin-bottom:6px;text-decoration:none}
.card-title:hover b{color:var(--brand)}
.card-title b{display:inline-flex;align-items:center;gap:6px}
.ic{display:inline-flex;vertical-align:-3px;margin-right:7px;color:var(--brand)}
.ic svg{display:block}
.foot{color:var(--sub);font-size:12px;margin-top:22px;text-align:center}
.foot a{color:var(--sub);text-decoration:underline}
.foot a:hover{color:var(--brand)}
.foot a.mail{color:var(--brand);font-weight:600;text-decoration:underline}
.note{font-size:12px;color:var(--sub);margin:18px 0 28px;padding:0;text-align:left;line-height:1.6}
.wb-toggle-tip{font-size:12px;color:var(--sub);margin:0 0 4px}
.col-sel{font-size:12.5px;font-weight:600;border:1px solid var(--line);border-radius:6px;background:#fff;padding:5px 8px;color:var(--ink);cursor:pointer;max-width:170px;white-space:nowrap;text-align:center;text-align-last:center}
.scroll table.wb-table th.ex-sticky,.scroll table.wb-table td.ex-sticky{position:sticky;left:0;z-index:1;background:var(--card);border-right:1px solid var(--line)}
.scroll table.wb-table th.ex-sticky{z-index:2;background:#f1f5f9}
.ex-notes{font-size:12px;color:var(--sub);margin:8px 0 0}
.ex-notes summary{cursor:pointer;font-weight:600}
.ex-notes ul{margin:6px 0 0 18px;padding:0}
</style>
</head>
<body>
<div class="wrap">
<header>
<div class="topbar">
<a class="logo" href="${lang === 'zh' ? '/zh/' : '/'}" aria-label="FeeEye home"><img src="/assets/logo.svg" alt="FeeEye" width="26" height="26">${SITE}</a>
<nav class="nav">
<div class="nav-item">
<button type="button" class="nav-btn${['tc','fee','fut','cmp','sec','pf'].includes(active) ? ' active' : ''}">${esc(i.navTools)} ${CHEV}</button>
<div class="dropdown"><a href="${absPath(lang, tcPath(lang))}">${ICON.receipt}<span>${esc(i.navTc)}</span></a><a href="${absPath(lang, futPath(lang))}">${ICON.trend}<span>${esc(i.navFut)}</span></a><a href="${absPath(lang, cmpPath(lang))}">${ICON.scale}<span>${esc(i.navCmp)}</span></a><a href="${absPath(lang, secPath(lang))}">${ICON.shield}<span>${esc(i.navSec)}</span></a><a href="${absPath(lang, pfPath(lang))}">${ICON.wallet}<span>${esc(i.navPf)}</span></a></div>
</div>
<div class="nav-item">
<button type="button" class="nav-btn${active === 'ex' ? ' active' : ''}">${esc(i.navExchanges)} ${CHEV}</button>
<div class="dropdown">${exLinks}</div>
</div>
<div class="nav-item">
<button type="button" class="nav-btn${active === 'cp' ? ' active' : ''}">${esc(i.navCompare)} ${CHEV}</button>
<div class="dropdown">${cmpPairs}</div>
</div>
<a href="${absPath(lang, gloPath(lang))}" class="${active === 'glo' ? 'active' : ''}">${esc(i.navLearn)}</a>
</nav>
<span><a href="${lang === 'zh' ? '/' : '/zh/'}">${esc(i.navZh)}</a></span>
</div>
</header>
${body}
<div class="foot">${discLine}${esc(i.foot)} ${esc(UPD)}.<br>${esc(i.footContact)}<a class="mail" href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a><br>${noHomeFoot ? '' : `<a href="${absPath(lang, 'index.html')}">${esc(i.footHome)}</a> · `}<a href="${absPath(lang, 'about.html')}">${esc(i.footAbout)}</a> · <a href="${absPath(lang, 'privacy.html')}">${esc(i.footPrivacy)}</a> · <a href="${absPath(lang, 'terms.html')}">${esc(i.footTerms)}</a></div>
</div>
<script>
(function(){
  var btns = document.querySelectorAll('.nav-btn');
  var closeTimer = null;
  function closeAll() {
    var opened = document.querySelectorAll('.nav-item.open');
    for (var j = 0; j < opened.length; j++) opened[j].classList.remove('open');
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeAll, 180);
  }
  function cancelClose() {
    clearTimeout(closeTimer);
  }
  for (var i = 0; i < btns.length; i++) {
    (function(btn){
      var item = btn.parentElement;
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var wasOpen = item.classList.contains('open');
        closeAll();
        cancelClose();
        if (!wasOpen) item.classList.add('open');
      });
      // 桌面 hover：进入立即打开（与 CSS hover 同步）；离开延迟 180ms 关闭
      item.addEventListener('mouseenter', function(){
        cancelClose();
        closeAll();
        item.classList.add('open');
      });
      item.addEventListener('mouseleave', scheduleClose);
    })(btns[i]);
  }
  document.addEventListener('click', function(){
    closeAll();
    cancelClose();
  });
})();
</script>
</body>
</html>`;
}

// ---- 区块构建（en / zh 双语言）----
function whereToBuy(c, lang) {
  const name = c.name, symbol = c.symbol;
  const zh = lang === 'zh';
  const L = (en, zhText) => (zh ? zhText : en);

  // 入金方式选项（各所并集，按常用程度排序）；option label 加「购买」明确支付方式
  const DEPOSIT_OPTIONS = [
    { m: 'Credit/Debit card', label: L('Buy by card', '信用卡购买') },
    { m: 'Bank transfer', label: L('Buy by bank transfer', '银行转账购买') },
    { m: 'P2P', label: L('Buy by P2P', 'P2P 购买') },
    { m: 'Apple Pay', label: L('Buy by Apple Pay', 'Apple Pay 购买') },
    { m: 'Google Pay', label: L('Buy by Google Pay', 'Google Pay 购买') },
    { m: 'PayPal', label: L('Buy by PayPal', 'PayPal 购买') },
    { m: 'Wire transfer', label: L('Buy by wire transfer', '电汇购买') },
    { m: 'Bpay', label: L('Buy by Bpay', 'Bpay 购买') }
  ];
  const depositFee = (ex, method) => {
    const d = (ex.deposit_methods || []).find((x) => x.m === method);
    if (!d) return '—';
    if (d.fee_max != null) return `${d.fee === 0 ? '0' : (d.fee * 100).toFixed(1)}–${(d.fee_max * 100).toFixed(1)}%`;
    return d.fee === 0 ? '0%' : `${(d.fee * 100).toFixed(1)}%`;
  };

  // 4 个维度列，每个含多个下拉子项；子项值全部写入 HTML（爬虫可抓全文），JS 按 select 切换显示
  const dims = [
    { key: 'deposit', label: T(lang, 'wbColDeposit'), options: DEPOSIT_OPTIONS.map((o, i) => ({ key: o.m, label: o.label, def: i === 0, cell: (ex) => depositFee(ex, o.m) })) },
    { key: 'spot', label: T(lang, 'wbColSpot'), options: [
      { key: 'taker', label: zh ? '现货吃单' : 'Spot taker', def: true, cell: (ex) => pct(ex.spot.taker) },
      { key: 'maker', label: zh ? '现货挂单' : 'Spot maker', def: false, cell: (ex) => pct(ex.spot.maker) }
    ] },
    { key: 'fut', label: T(lang, 'wbColFut'), options: [
      { key: 'taker', label: zh ? '合约吃单' : 'Futures taker', def: true, cell: (ex) => pct(ex.futures.taker) },
      { key: 'maker', label: zh ? '合约挂单' : 'Futures maker', def: false, cell: (ex) => pct(ex.futures.maker) }
    ] },
    { key: 'feat', label: T(lang, 'wbColFeat'), options: [
      { key: 'copy', label: T(lang, 'wbCopy'), def: true, cell: (ex) => (ex.has_copy_trading ? '✓' : '—') },
      { key: 'bot', label: T(lang, 'wbBot'), def: false, cell: (ex) => (ex.has_trading_bot ? '✓' : '—') },
      { key: 'api', label: T(lang, 'wbApi'), def: false, cell: (ex) => (ex.has_api ? '✓' : '—') }
    ] }
  ];

  // 只展示上架该币的交易所；前三位固定 Binance/OKX/KuCoin（变现主力 + 用户认知），其余保持 EX 原顺序
  const PRIORITY = ['binance', 'okx', 'kucoin'];
  const supported = Object.keys(EX).filter((slug) => c.exchanges.includes(slug));
  const slugs = [...PRIORITY.filter((s) => supported.includes(s)), ...supported.filter((s) => !PRIORITY.includes(s))];

  const ths = `<th class="ex-sticky">${esc(T(lang, 'thExchange'))}</th>` + dims.map((d) => {
    const opts = d.options.map((o) => `<option value="${esc(o.key)}"${o.def ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
    return `<th data-col="${d.key}"><select class="col-sel" data-col="${d.key}" aria-label="${esc(d.label)}">${opts}</select></th>`;
  }).join('') + '<th></th>';

  const rows = slugs.map((slug) => {
    const ex = EX[slug];
    const note = ex.new_user_note ? ` title="${esc(ex.new_user_note)}"` : '';
    const cells = dims.map((d) => {
      const spans = d.options.map((o) => `<span data-sub="${esc(o.key)}"${o.def ? '' : ' style="display:none"'}>${o.cell(ex)}</span>`).join('');
      return `<td data-col="${d.key}">${spans}</td>`;
    }).join('');
    const cta = ctaHtml(slug, esc(T(lang, 'ctaBuy', { s: symbol, x: ex.name })), lang);
    return `<tr><td class="ex-sticky"><b${note}>${ex.name}</b></td>${cells}<td style="text-align:center">${cta}</td></tr>`;
  }).join('');

  const sep = lang === 'zh' ? '：' : ': ';
  const notes = slugs.map((slug) => {
    const ex = EX[slug];
    return ex.new_user_note ? `<li><b>${ex.name}</b>${sep}${esc(ex.new_user_note)}</li>` : '';
  }).filter(Boolean).join('');
  const notesHtml = notes ? `<details class="ex-notes"><summary>${esc(T(lang, 'wbNotesTitle'))}</summary><ul>${notes}</ul></details>` : '';
  const change = c.change_24h;
  const changeHtml = change != null ? ` · 24h: <span style="color:${change >= 0 ? '#dc2626' : '#16a34a'};font-weight:600">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>` : '';
  const priceLine = `<p class="intro">${esc(T(lang, 'priceLine', { n: name, s: symbol, p: fmtPrice(c.price), m: fmtCap(c.market_cap), r: c.rank, d: COIN_SNAPSHOT }))}${changeHtml}</p>`;
  // 无上架数据时降级为空态提示，其余渲染可切换子项的下拉维度列
  const toggleBlock = slugs.length === 0
    ? `<p class="intro">${esc(T(lang, 'wbEmpty', { s: symbol }))}</p>`
    : `<p class="wb-toggle-tip">${esc(T(lang, 'wbToggle'))}</p>
  <div class="scroll"><table class="wb-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>
  ${notesHtml}
  <script>
  (function(){
    var sels = document.querySelectorAll('.col-sel');
    for (var i = 0; i < sels.length; i++) {
      sels[i].addEventListener('change', function(){
        var key = this.getAttribute('data-col');
        var val = this.value;
        var tds = document.querySelectorAll('td[data-col="' + key + '"]');
        for (var j = 0; j < tds.length; j++) {
          var spans = tds[j].querySelectorAll('span[data-sub]');
          for (var k = 0; k < spans.length; k++) {
            spans[k].style.display = spans[k].getAttribute('data-sub') === val ? '' : 'none';
          }
        }
      });
    }
  })();
  </script>`;
  const body = `
  <h1>${esc(T(lang, 'wbH1', { n: name, s: symbol }))}</h1>
  ${priceLine}
  ${toggleBlock}`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: T(lang, 'wbQ1', { n: name, s: symbol }), answer: { '@type': 'Answer', text: T(lang, 'wbA1', { n: name, s: symbol, c: c.exchanges.length }) } }
    ]
  };
  return page({ lang, title: T(lang, 'wbTitle', { n: name, s: symbol }), desc: T(lang, 'wbDesc', { n: name, s: symbol }), body, jsonLd, path: `${lang === 'zh' ? 'zh/' : ''}where-to-buy/${c.symbol.toLowerCase()}.html`, affiliate: true });
}

function exchangePage(slug, lang) {
  const ex = EX[slug];
  const zh = lang === 'zh';
  const L = (en, zhText) => (zh ? zhText : en);
  const cd = EXCHANGE_COMPARE[slug] || {};
  const rawTiers = ex.vip_tiers || [];
  // zh 版：档位名翻译（Regular/Standard/Pro N）
  const tiers = zh ? rawTiers.map((t) => ({ ...t, t: trZh(t.t, TIER_ZH_MAP) })) : rawTiers;
  const disc = ex.token_discount;
  const discStatus = ex.token_discount_status;
  const cmp = Object.keys(EX).filter((s) => s !== slug).slice(0, 3);
  const cmpLinks = cmp.map((s) => {
    const [x, y] = [slug, s].sort();
    return `<a href="${absPath(lang, 'compare/' + x + '-vs-' + y + '.html')}">${ex.name} vs ${EX[s].name}</a>`;
  }).join(' · ');
  const configuredCompareSlug = EX_PRIMARY_COMPARE[slug];
  const compareSlug = configuredCompareSlug && configuredCompareSlug !== slug && EX[configuredCompareSlug]
    ? configuredCompareSlug
    : cmp[0];
  const [compareX, compareY] = [slug, compareSlug].sort();
  const compareHref = absPath(lang, `compare/${compareX}-vs-${compareY}.html`);
  const brandMark = ({ okx: 'OK', kucoin: 'K', binance: 'B', bybit: 'B', bitget: 'B', kraken: 'K', coinbase: 'C' })[slug] || ex.name.slice(0, 1).toUpperCase();
  const brandColor = EX_BRAND[slug] || '#64748b';
  const brandText = ['binance', 'bybit'].includes(slug) ? '#111827' : '#ffffff';

  // 头部信任背书区块（统一 6 个 badge 槽位 · 3×2 grid · 按 lang 取 en/zh）
  const trustBadges = (ex.trust_badges || []).map((b) => ({ type: b.type, text: b[lang] || b.en })).filter((b) => b.text);
  // 平台币折扣：现货 + 合约 双档（schema {token, spot, futures, note}）
  const discNote = disc ? (disc.note?.[lang] || disc.note?.en || '') : '';

  // 提币费表格（多链）
  const wdRows = Object.entries(ex.withdrawal_fees || {}).map(([net, fee]) => `<tr><td>${esc(net)}</td><td>${fee?.amount == null ? '—' : usd(fee.amount)}${String(fee?.model || '').includes('dynamic') ? ` <small>${lang === 'zh' ? '动态快照' : 'dynamic snapshot'}</small>` : ''}</td></tr>`).join('');

  // 安全合规值按语言取（数据层为 {en, zh} 双语结构）
  const secV = (v) => (v && typeof v === 'object' ? (v[lang] || v.en || '—') : (v || '—'));
  const incidentRaw = secV(cd.incident);

  // 安全历史解析（事件 + 处理方式；支持中英文括号）
  function parseIncidents(s) {
    if (!s) return [];
    return s.split(/[;；]/).map((x) => x.trim()).filter(Boolean).map((x) => {
      const m = x.match(/^(.+?)\s*[（(]([^）)]+)[）)]\s*$/);
      if (m) return { event: m[1].trim(), response: m[2].trim() };
      if (/no hack|no external hack|no major hack/i.test(x) || /无.*黑客|无.*安全事件|无.*被盗/i.test(x)) return { event: x, response: zh ? '无重大安全事件' : 'No major security incident' };
      if (/settlement|fine|penalty|doj/i.test(x) || /和解|处罚|罚款|司法部/i.test(x)) return { event: x, response: zh ? '已通过监管和解' : 'Resolved via regulatory settlement' };
      if (/banned|paused|restricted/i.test(x) || /地区限制/i.test(x)) return { event: x, response: zh ? '地区限制' : 'Regional restriction' };
      return { event: x, response: zh ? '已记录' : 'Recorded' };
    });
  }
  const incidents = parseIncidents(incidentRaw);
  const incidentHtml = incidents.length ? incidents.map((i) => `<div class="srow inc"><span class="inc-event">${esc(i.event)}</span><b class="inc-resp">${esc(i.response)}</b></div>`).join('') : '';

  // 能力卡片：解释功能用途，并区分高风险产品。
  const yesNo = (b) => b ? T(lang, 'exBotYes') : T(lang, 'exBotNo');
  const baseTier = tiers[0] || {};
  const cheapestWithdrawal = Object.entries(ex.withdrawal_fees || {}).filter(([, fee]) => fee?.amount != null).sort((a, b) => a[1].amount - b[1].amount)[0] || ['—', null];
  const evidenceHtml = trustBadges.length ? `<div class="exchange-evidence"><div class="exchange-evidence-title">${esc(L('Published recognition and service signals', '公开背书与服务信息'))}</div><div class="exchange-evidence-grid">${trustBadges.map((b) => `<div class="exchange-evidence-item">${TRUST_ICON[b.type] || ''}<span>${esc(b.text)}</span></div>`).join('')}</div></div>` : '';
  const capCard = (title, status, desc, risk = false) => `<div class="exchange-cap-card${risk ? ' risk' : ''}"><div class="exchange-cap-top"><b>${esc(title)}</b><span class="exchange-cap-status">${esc(status)}</span></div><p>${esc(desc)}</p></div>`;
  const exchangeCapabilities = [
    capCard(L('Spot trading', '现货交易'), L('Supported', '支持'), L('Buy and sell crypto assets directly without borrowing. This is the simplest trading mode for beginners.', '直接买卖加密资产，不借入资金；这是新手最容易理解的交易方式。')),
    capCard(L('Margin trading', '杠杆交易'), yesNo(cd.has_margin), L('Borrowing can magnify both gains and losses, and positions may be liquidated.', '通过借入资产放大仓位，同时放大亏损，并可能触发强平。'), true),
    capCard(L('Futures contracts', '合约交易'), `${cd.max_leverage ? cd.max_leverage + 'x · ' : ''}${L('High risk', '高风险')}`, L('Derivatives do not equal owning the underlying coin. Leverage and funding costs can rapidly erode margin.', '衍生品不等于持有现货；杠杆、资金费率和价格波动可能快速消耗保证金。'), true),
    capCard(L('Options', '期权'), yesNo(cd.has_options), cd.has_options ? L('Options have non-linear payoffs and expiry. Understand premium and maximum loss before use.', '期权包含权利金、到期日和非线性损益，使用前必须理解最大损失。') : L('Not listed as supported in the current FeeEye snapshot.', 'FeeEye 当前快照未记录该功能。'), !!cd.has_options),
    capCard(L('Leveraged tokens', '杠杆代币'), yesNo(cd.has_leveraged_tokens), cd.has_leveraged_tokens ? L('Built-in leverage and rebalancing can create path-dependent losses in volatile markets.', '内置杠杆与再平衡机制会产生路径损耗，震荡行情下尤其需要谨慎。') : L('Not listed as supported in the current FeeEye snapshot.', 'FeeEye 当前快照未记录该功能。'), !!cd.has_leveraged_tokens),
    capCard(L('Copy trading', '跟单交易'), yesNo(ex.has_copy_trading), ex.has_copy_trading ? L('Past performance of a lead trader does not guarantee future results. Set an independent loss limit.', '带单员历史表现不代表未来收益，仍需独立设置最大亏损限制。') : L('Not listed as supported in the current FeeEye snapshot.', 'FeeEye 当前快照未记录该功能。'), !!ex.has_copy_trading),
    capCard(L('Trading bots', '交易机器人'), yesNo(ex.has_trading_bot), ex.has_trading_bot ? L('Automation executes a strategy; it does not make the strategy profitable or remove market risk.', '机器人只负责自动执行策略，不会让策略天然盈利，也不会消除市场风险。') : L('Not listed as supported in the current FeeEye snapshot.', 'FeeEye 当前快照未记录该功能。')),
    capCard(L('API access', 'API 接口'), yesNo(ex.has_api), ex.has_api ? L('For portfolio tools or programmatic trading. Never give an API key withdrawal permission unless essential.', '可连接记账或程序化工具；非必要不要给 API Key 开启提币权限。') : L('Not listed as supported in the current FeeEye snapshot.', 'FeeEye 当前快照未记录该功能。'))
  ].join('');
  const depositNoteZh = {
    'Bank transfer': '费用、币种和可用性因地区及银行而异',
    'Wire transfer': '银行可能另外收取固定手续费',
    'Credit/Debit card': '通常由第三方通道处理，实际费率以付款页为准',
    'Apple Pay': '通常走银行卡或第三方通道，以付款页为准',
    'Google Pay': '通常走银行卡或第三方通道，以付款页为准',
    'PayPal': '第三方支付通道，费率和可用性因地区而异',
    'Bpay': '澳洲银行支付，以实时页面为准',
    'P2P': '平台费快照为 0，成交价格仍可能有价差'
  };
  const exchangeDepRows = (ex.deposit_methods || []).map((d) => {
    const m = zh ? trZh(d.m, DEP_ZH_MAP) : d.m;
    const fee = d.fee === 0 ? '0' : (d.fee_max != null ? pct(d.fee) + ' – ' + pct(d.fee_max) : pct(d.fee));
    const note = zh ? (depositNoteZh[d.m] || d.note || '—') : (d.note || '—');
    return `<tr><td>${esc(m)}</td><td>${fee}</td><td>${esc(note)}</td></tr>`;
  }).join('');
  const discStatusText = discStatus ? (discStatus[lang] || discStatus.en || '') : '';
  const discountFeeCard = disc && disc.token
    ? `<div class="exchange-fee-card"><span>${esc(L(`With ${disc.token} discount`, `开启 ${disc.token} 抵扣`))}</span><b>${pct(baseTier.st * (1 - (disc.spot || 0)))}</b><small>${esc(L('Spot taker example', '现货吃单示例'))}</small></div>`
    : discStatusText
      ? `<div class="exchange-fee-card"><span>${esc(L('Platform-token discount', '平台币手续费抵扣'))}</span><b>${esc(L('Not supported', '不支持'))}</b><small>${esc(discStatusText)}</small></div>`
      : `<div class="exchange-fee-card"><span>${esc(L('Platform-token discount', '平台币手续费抵扣'))}</span><b>${esc(L('Not listed', '未记录'))}</b><small>${esc(L('Base rates shown', '按基础费率展示'))}</small></div>`;
  const fullFeeSummary = disc && disc.token
    ? L(`View full VIP fee table and ${disc.token} discount switch`, `查看完整 VIP 费率表与 ${disc.token} 抵扣开关`)
    : L('View full VIP fee table', '查看完整 VIP 费率表');
  const detailSourceLink = (key, label) => ex.evidence?.[key]?.url ? `<a href="${esc(ex.evidence[key].url)}" rel="noopener" target="_blank">${esc(label)} · ${esc(ex.evidence[key].checked_at || '')}</a>` : '';
  const cheapestWithdrawalText = cheapestWithdrawal[1] == null
    ? L('Live quote required', '需在确认页查看实时费用')
    : `${cheapestWithdrawal[0]} · ${usd(cheapestWithdrawal[1].amount)}`;

  const exchangeDetailBody = `<div class="exchange-page">
    <section class="exchange-hero" aria-labelledby="exchange-title" style="--ex-brand:${esc(brandColor)};--ex-on-brand:${esc(brandText)}">
      <div class="exchange-hero-main">
        <div class="exchange-identity">
          <div class="exchange-mark" aria-hidden="true">${esc(brandMark)}</div>
          <div>
            <div class="exchange-eyebrow">${esc(L('Exchange review · snapshot ' + UPD, '交易所评测 · 数据快照 ' + UPD))}</div>
            <h1 id="exchange-title">${esc(L(`${ex.name} beginner guide`, `${ex.name} 新手评测与费用指南`))}</h1>
            <p class="exchange-summary">${esc(L(`${ex.name} lists about ${cd.coins != null ? cd.coins.toLocaleString() : '—'} tracked spot assets in this snapshot. Beginners should compare the regular-user fee, verify regional availability, and treat every leveraged product as high risk.`, `${ex.name} 在当前快照中约有 ${cd.coins != null ? cd.coins.toLocaleString() : '—'} 个追踪现货币种。新手应先比较普通用户费率、确认地区可用性，并把所有杠杆产品视为高风险工具。`))}</p>
          </div>
        </div>
        <div class="exchange-actions">
          ${linkFor(slug) ? ctaHtml(slug, esc(T(lang, 'ctaAcct', { x: ex.name })), lang) : ''}
          <a class="secondary-cta" href="${compareHref}">${esc(L(`Compare with ${EX[compareSlug].name}`, `与 ${EX[compareSlug].name} 对比`))}</a>
        </div>
      </div>
      <div class="exchange-stats">
        <div class="exchange-stat"><span>${esc(L('Base spot maker / taker', '现货基础挂单 / 吃单'))}</span><b>${pct(ex.spot.maker)} / ${pct(ex.spot.taker)}</b><small>${esc(L('Regular user snapshot', '普通用户费率快照'))}</small></div>
        <div class="exchange-stat"><span>${esc(L('Base futures maker / taker', '合约基础挂单 / 吃单'))}</span><b>${pct(ex.futures.maker)} / ${pct(ex.futures.taker)}</b><small>${esc(L('Leverage can liquidate positions', '杠杆可能触发强平'))}</small></div>
        <div class="exchange-stat"><span>${esc(L('Lowest listed USDT withdrawal', '最低 USDT 提币费'))}</span><b>${esc(cheapestWithdrawalText)}</b><small>${esc(L('Network must match the receiving wallet', '必须与接收钱包网络一致'))}</small></div>
        <div class="exchange-stat"><span>${esc(L('Maximum listed leverage', '页面记录最高杠杆'))}</span><b>${cd.max_leverage ? cd.max_leverage + 'x' : '—'}</b><small>${esc(L('High risk · not for beginners', '高风险 · 不建议新手使用'))}</small></div>
      </div>
      ${evidenceHtml}
    </section>

    <nav class="exchange-nav" aria-label="${esc(L('Page sections', '页面目录'))}">
      <a href="#fees">${esc(L('Fees', '费用'))}</a><a href="#capabilities">${esc(L('Trading capabilities', '交易能力'))}</a><a href="#funding">${esc(L('Deposit & withdrawal', '入金与提币'))}</a><a href="#safety">${esc(L('Safety & compliance', '安全与合规'))}</a><a href="#checklist">${esc(L('Before signup', '注册前检查'))}</a>
    </nav>

    <section class="exchange-section" id="fees">
      <div class="exchange-section-head"><div><h2>${esc(L('Fees: start with the regular-user rate', '费用：新手先看普通用户档'))}</h2><p>${esc(L('The four figures below cover the common base tier. The full VIP table is retained but collapsed to reduce noise.', '先展示最常用的基础档；完整 VIP 费率表保留在下方，默认折叠以减少信息干扰。'))}</p></div></div>
      <div class="exchange-fee-summary">
        <div class="exchange-fee-card"><span>${esc(L('Spot maker', '现货挂单'))}</span><b>${pct(baseTier.sm)}</b><small>${esc(L('Regular user', '普通用户'))}</small></div>
        <div class="exchange-fee-card"><span>${esc(L('Spot taker', '现货吃单'))}</span><b>${pct(baseTier.st)}</b><small>${esc(L('Regular user', '普通用户'))}</small></div>
        ${discountFeeCard}
        <div class="exchange-fee-card"><span>${esc(L('Futures maker / taker', '合约挂单 / 吃单'))}</span><b>${pct(baseTier.fm)} / ${pct(baseTier.ft)}</b><small>${esc(L('High-risk product', '高风险产品'))}</small></div>
      </div>
      <div class="compare-source-links">${detailSourceLink('trading_fees', L('Official fee source', '官方费率来源'))}</div>
      <details class="exchange-vip-details">
        <summary>${esc(fullFeeSummary)}</summary>
        <div class="fee-panel">
          <div class="fee-tabs"><button type="button" class="ftab active" data-mkt="spot">${zh ? '现货' : 'Spot'}</button><button type="button" class="ftab" data-mkt="fut">${zh ? '合约' : 'Futures'}</button></div>
          ${disc && disc.token ? `<div class="fee-toggle"><label class="switch"><input type="checkbox" id="feeSwitch"><span class="sl"></span></label><span class="disc-label" data-active-note="${esc(discNote)}" data-unavailable-note="${esc(L(`The ${disc.token} discount does not apply to this market`, `${disc.token} 抵扣不适用于当前市场`))}">${esc(discNote)}</span></div>` : ''}
          <div class="scroll"><table class="fee-table" id="feeTable"><thead><tr><th>${esc(T(lang, 'exTier'))}</th><th>${esc(T(lang, 'exThreshold'))}</th><th>${esc(T(lang, 'exMaker'))}</th><th>${esc(T(lang, 'exTaker'))}</th></tr></thead><tbody></tbody></table></div>
        </div>
      </details>
    </section>

    <section class="exchange-section" id="capabilities">
      <div class="exchange-section-head"><div><h2>${esc(L('Trading capabilities', '交易能力'))}</h2><p>${esc(L(`About ${cd.coins != null ? cd.coins.toLocaleString() : '—'} tracked spot assets · 24h volume snapshot ${cd.volume || '—'}. Product availability varies by region.`, `约 ${cd.coins != null ? cd.coins.toLocaleString() : '—'} 个追踪现货币种 · 24h 交易量快照 ${cd.volume || '—'}。具体功能是否开放取决于所在地区。`))}</p></div></div>
      <div class="exchange-cap-note"><b>${esc(L('Beginner rule:', '新手原则：'))}</b> ${esc(L('“Supported” only means the feature exists. It does not mean the feature is suitable, safe, or profitable.', '“支持”只代表存在该功能，不代表适合你、安全或能够盈利。'))}</div>
      <div class="exchange-cap-grid">${exchangeCapabilities}</div>
    </section>

    <section class="exchange-section" id="funding">
      <div class="exchange-section-head"><div><h2>${esc(L('Deposit and withdrawal', '入金与提币'))}</h2><p>${esc(L('Payment channels vary by residence and provider. Withdrawal fees are snapshots and the selected network must match the receiving wallet.', '支付通道会因地区和服务商变化；提币费为快照，转出网络必须与接收钱包完全一致。'))}</p></div></div>
      <div class="exchange-two-col">
        <div class="exchange-subcard"><h3>${esc(L('Deposit methods', '入金方式'))}</h3><p>${esc(L('A displayed platform fee of zero does not exclude bank fees, FX spread, or P2P price differences.', '平台费显示为 0，不代表没有银行费、换汇价差或 C2C 成交价差。'))}</p><div class="scroll"><table><thead><tr><th>${esc(T(lang, 'exMethod'))}</th><th>${esc(T(lang, 'exFee'))}</th><th>${esc(L('Notes', '说明'))}</th></tr></thead><tbody>${exchangeDepRows}</tbody></table></div></div>
        <div class="exchange-subcard"><h3>${esc(L('USDT withdrawal networks', 'USDT 提币网络'))}</h3><p>${esc(L('Do a small test transfer first. Sending to an unsupported network can make assets unrecoverable.', '建议先做小额测试；网络不匹配可能导致资产无法找回。'))}</p><div class="scroll"><table><thead><tr><th>${esc(T(lang, 'exNet'))}</th><th>${esc(T(lang, 'exFee'))}</th></tr></thead><tbody>${wdRows}</tbody></table></div></div>
      </div>
      <div class="compare-source-links">${detailSourceLink('withdrawal_fees', L('Official withdrawal source', '官方提币来源'))}</div>
    </section>

    <section class="exchange-section" id="safety">
      <div class="exchange-section-head"><div><h2>${esc(L('Safety and compliance', '安全与合规'))}</h2><p>${esc(L('These are public disclosures and recorded events, not a guarantee that funds cannot be lost.', '以下为公开披露与事件记录，不代表资金不会遭受损失。'))}</p></div></div>
      <div class="exchange-safety-grid">
        <div class="exchange-subcard"><h3>${esc(L('Current disclosures', '当前披露'))}</h3><div class="sec-list"><div class="srow"><span>${esc(T(lang, 'exReserve'))}</span><b>${esc(secV(cd.reserve))}</b></div><div class="srow"><span>${esc(T(lang, 'exCold'))}</span><b>${esc(secV(cd.cold))}</b></div><div class="srow"><span>${esc(T(lang, 'exLicenses'))}</span><b>${esc(secV(cd.licenses))}</b></div><div class="srow"><span>${esc(T(lang, 'exKyc'))}</span><b>${esc(secV(cd.kyc))}</b></div></div></div>
        <div class="exchange-subcard"><h3>${esc(L('Recorded incidents', '事件记录'))}</h3><div class="sec-list"><div class="srow inc-head"><span>${esc(T(lang, 'exIncident'))}</span><b>${esc(T(lang, 'exResponse'))}</b></div>${incidentHtml || `<div class="srow"><span>—</span></div>`}</div></div>
      </div>
      <div class="compare-source-links">${detailSourceLink('kyc', L('KYC source', 'KYC 来源'))}${detailSourceLink('regulation', L('Licence source', '牌照来源'))}${detailSourceLink('reserves', L('Reserve source', '储备来源'))}</div>
    </section>

    <section class="exchange-section" id="checklist">
      <div class="exchange-section-head"><div><h2>${esc(L('Before opening an account', '注册前检查清单'))}</h2><p>${esc(L(`Complete these checks on ${ex.name}’s current pages before depositing funds.`, `入金前请在 ${ex.name} 当前页面逐项确认。`))}</p></div></div>
      <ul class="exchange-checklist"><li>${esc(L('Your residence and required product are supported.', '你的居住地与所需产品均可使用。'))}</li><li>${esc(L('You understand KYC requirements and account entity.', '你理解 KYC 要求及实际签约主体。'))}</li><li>${esc(L('The live fee screen matches your payment method and tier.', '实时费率与你的支付方式和等级一致。'))}</li><li>${esc(L('The withdrawal network matches the receiving wallet exactly.', '提币网络与接收钱包完全一致。'))}</li><li>${esc(L('Two-factor authentication and anti-phishing code are enabled.', '已开启双重验证和防钓鱼码。'))}</li><li>${esc(L('Leveraged products remain disabled unless you understand liquidation.', '不理解强平机制时，不开启杠杆产品。'))}</li></ul>
      <div class="exchange-final"><p>${esc(T(lang, 'exNote'))}<br>${esc(T(lang, 'exCompare'))}${cmpLinks}</p>${linkFor(slug) ? ctaHtml(slug, esc(T(lang, 'ctaAcct', { x: ex.name })), lang) : ''}</div>
    </section>
  </div>`;

  const feeScript = `<script>
  (function(){
    var tiers = ${JSON.stringify(tiers)};
    var discSpot = ${disc && disc.spot != null ? disc.spot : 'null'};
    var discFut  = ${disc && disc.futures != null ? disc.futures : 'null'};
    var mkt = 'spot';
    var useDisc = false;
    var tabs = document.querySelectorAll('.ftab');
    var sw = document.getElementById('feeSwitch');
    var discLabel = document.querySelector('.disc-label');
    var tbody = document.querySelector('#feeTable tbody');
    function fmt(x){ return x == null ? '\u2014' : (x*100).toFixed(4).replace(/\\.?0+$/, '') + '%'; }
    function cnThresh(s){
      // zh 时把 "$1M" / "$2B" 等转中文（"100 万美元" / "20 亿美元"）
      if (!${zh}) return s;
      var m = s.match(/^([<>≥≤]\\s*)?\\$?([\\d.]+)\\s*([KMB])?$/);
      if (!m) return s;
      var cmp = m[1] || '', num = parseFloat(m[2]), unit = m[3] || '';
      var cnv;
      if (unit === 'K') cnv = Math.round(num / 10) + ' 万';
      else if (unit === 'M') cnv = num >= 100 ? (num / 100) + ' 亿' : (num * 100) + ' 万';
      else if (unit === 'B') cnv = (num * 10) + ' 亿';
      else cnv = num.toString();
      return cmp + cnv + ' 美元';
    }
    function discRate(){ return useDisc ? (mkt === 'spot' ? discSpot : discFut) : 0; }
    function syncDiscountUi(){
      if (!sw) return;
      var available = (mkt === 'spot' ? discSpot : discFut) != null;
      sw.disabled = !available;
      if (!available) { sw.checked = false; useDisc = false; }
      if (discLabel) discLabel.textContent = available ? discLabel.getAttribute('data-active-note') : discLabel.getAttribute('data-unavailable-note');
    }
    function apply(rate, d){
      return d > 0 ? rate * (1 - d) : rate;
    }
    function render(){
      var d = discRate();
      var rows = tiers.map(function(t){
        var mk = apply(mkt === 'spot' ? t.sm : t.fm, d);
        var tk = apply(mkt === 'spot' ? t.st : t.ft, d);
        var th = mkt === 'spot' ? (t.th_spot || t.th) : (t.th_futures || t.th);
        return '<tr><td>' + t.t + '</td><td>' + cnThresh(th) + '</td><td>' + fmt(mk) + '</td><td>' + fmt(tk) + '</td></tr>';
      }).join('');
      tbody.innerHTML = rows;
    }
    for (var i=0;i<tabs.length;i++){ tabs[i].addEventListener('click', function(e){
      for (var j=0;j<tabs.length;j++) tabs[j].classList.remove('active');
      this.classList.add('active');
      mkt = this.getAttribute('data-mkt');
      syncDiscountUi();
      render();
    });}
    if (sw){ sw.addEventListener('change', function(){ useDisc = sw.checked; render(); }); }
    syncDiscountUi();
    render();
  })();
  </script>`;
  const body = exchangeDetailBody + feeScript;
  return page({ lang, title: T(lang, 'exTitle', { n: ex.name, slogan: (ex.slogan && (ex.slogan[lang] || ex.slogan.en)) || T(lang, 'exH1Default') }), desc: T(lang, 'exDesc', { n: ex.name }), body, path: `${lang === 'zh' ? 'zh/' : ''}exchanges/${slug}.html`, affiliate: false });
}

function comparePage(slugA, slugB, lang) {
  const a = EX[slugA], b = EX[slugB];
  const zh = lang === 'zh';
  const L = (en, zhText) => zh ? zhText : en;
  const sample = 1000;
  const money = (n) => `$${Number(n).toFixed(2)}`;
  const depositNoteZh = { 'Bank transfer':'费用和可用性因地区、银行而异', 'Wire transfer':'银行可能另外收取固定费用', 'Credit/Debit card':'通常由第三方支付通道处理，以付款页为准', 'Apple Pay':'通常走银行卡或第三方通道，以付款页为准', 'Google Pay':'通常走银行卡或第三方通道，以付款页为准', 'PayPal':'费率和可用性因地区而异', 'Bpay':'澳大利亚银行支付，以付款页为准', 'P2P':'平台费可能为0，但成交价仍可能有价差' };
  const methodLabel = (d) => {
    const name = zh ? trZh(d.m, DEP_ZH_MAP) : d.m;
    const lo = `${(d.fee * 100).toFixed(d.fee ? 1 : 0)}%`;
    const hi = d.fee_max != null && d.fee_max !== d.fee ? `–${(d.fee_max * 100).toFixed(1)}%` : '';
    const note = zh ? (depositNoteZh[d.m] || '以付款页为准') : (d.note || 'varies by region');
    return `${esc(name)}：${lo}${hi} <small>(${esc(note)})</small>`;
  };

  const takerA = sample * a.spot.taker, takerB = sample * b.spot.taker;
  const makerA = sample * a.spot.maker, makerB = sample * b.spot.maker;
  const withdrawalCost = (slug, ex, network) => {
    const quote = getWithdrawalQuote(slug, network, sample);
    return quote ? quote.total : null;
  };
  const commonNetworks = getWithdrawalNetworks(slugA).filter((n) => getFee(slugA, n) != null && getFee(slugB, n) != null);
  const lowCostNetwork = commonNetworks.slice().sort((x, y) => Math.max(withdrawalCost(slugA, a, x), withdrawalCost(slugB, b, x)) - Math.max(withdrawalCost(slugA, a, y), withdrawalCost(slugB, b, y)))[0] || null;
  const lowA = lowCostNetwork ? withdrawalCost(slugA, a, lowCostNetwork) : null;
  const lowB = lowCostNetwork ? withdrawalCost(slugB, b, lowCostNetwork) : null;
  const feeVerdict = (va, vb) => Math.abs(va - vb) < 0.000001
    ? L('Same published fee', '费用相同')
    : L(`${va < vb ? a.name : b.name} lower by ${money(Math.abs(va - vb))}`, `${va < vb ? a.name : b.name} 少 ${money(Math.abs(va - vb))}`);
  const verdictLead = L(
    `There is no universal winner. For a first small purchase, verify regional access and funding first; the cards below show only conclusions supported by the current snapshot.`,
    `没有哪家交易所适合所有人。先看你所在地区能不能用，再按买入金额、成交方式和提币需求比较费用。`
  );

  const networkRows = commonNetworks.map((network) => {
    const fa = withdrawalCost(slugA, a, network), fb = withdrawalCost(slugB, b, network);
    return `<tr><td><b>${esc(network)}</b></td><td class="${fa < fb ? 'low' : ''}">${usd(fa)}</td><td class="${fb < fa ? 'low' : ''}">${usd(fb)}</td><td>${fa === fb ? esc(L('Same', '一样')) : esc(L(`${fa < fb ? a.name : b.name} lower by ${usd(Math.abs(fa - fb))}`, `${fa < fb ? a.name : b.name} 少 ${usd(Math.abs(fa - fb))}`))}</td></tr>`;
  }).join('');
  const withdrawalProcessingNote = [a, b].filter((ex) => ex.withdrawal_processing).map((ex) => L(
    `${ex.name}: includes ${(ex.withdrawal_processing.rate * 100).toFixed(2)}% processing fee (cap ${ex.withdrawal_processing.cap} USDT) plus the recorded network-fee snapshot.`,
    `${ex.name} 还会收 ${(ex.withdrawal_processing.rate * 100).toFixed(2)}% 处理费（最多 ${ex.withdrawal_processing.cap} USDT），表中已经算进去。`
  )).join(' ');

  const countryZh = { CN:'中国大陆', HK:'中国香港', US:'美国', SG:'新加坡', DE:'德国', GB:'英国', FR:'法国', JP:'日本', BR:'巴西', IN:'印度', AU:'澳大利亚', CA:'加拿大', NG:'尼日利亚', TR:'土耳其', AE:'阿联酋', PH:'菲律宾', ID:'印度尼西亚', VN:'越南', MX:'墨西哥', ZA:'南非', KR:'韩国', TH:'泰国', PL:'波兰', ES:'西班牙', IT:'意大利' };
  const regionOptions = Object.keys(CA).map((cc) => `<option value="${esc(cc)}">${esc(zh ? (countryZh[cc] || COUNTRY_NAMES[cc] || cc) : (COUNTRY_NAMES[cc] || cc))}</option>`).join('');
  const networkOptions = commonNetworks.map((network) => `<option value="${esc(network)}">${esc(network)}</option>`).join('');
  const pairAvailability = {};
  Object.entries(CA).forEach(([cc, info]) => {
    pairAvailability[cc] = { restricted: !!info.restricted, decision: info.decision || '', a: info.exchanges?.[slugA], b: info.exchanges?.[slugB], note: info.note || '', source: info.source || '' };
  });
  const decisionData = {
    a: { slug: slugA, name: a.name, spot: a.spot, withdrawal_fees: a.withdrawal_fees, withdrawal_processing: a.withdrawal_processing || null },
    b: { slug: slugB, name: b.name, spot: b.spot, withdrawal_fees: b.withdrawal_fees, withdrawal_processing: b.withdrawal_processing || null },
    availability: pairAvailability,
    networks: commonNetworks
  };
  const evidenceLink = (ex, key, label) => ex.evidence?.[key]?.url ? `<a href="${esc(ex.evidence[key].url)}" rel="noopener" target="_blank">${esc(ex.name)} ${esc(label)} · ${esc(ex.evidence[key].checked_at || '')}</a>` : '';
  const feeEvidenceHtml = `<div class="compare-source-links">${evidenceLink(a, 'trading_fees', L('fee source', '费率来源'))}${evidenceLink(b, 'trading_fees', L('fee source', '费率来源'))}${evidenceLink(a, 'withdrawal_fees', L('withdrawal source', '提币来源'))}${evidenceLink(b, 'withdrawal_fees', L('withdrawal source', '提币来源'))}</div>`;
  const decisionJson = JSON.stringify(decisionData).replace(/</g, '\\u003c');
  const decisionText = JSON.stringify({
    selectRegion: L('Select your region to start', '先选地区，才能判断这两家能不能用'),
    regionFirst: L('Regional availability is checked before any fee comparison.', '先看能不能用，再看费用高低。'),
    waiting: L('Waiting for region', '待选择'),
    regionNotCovered: L('FeeEye does not provide an availability verdict for this region', '这个地区暂时没有足够资料，FeeEye 不下结论'),
    blockedTitle: L('Neither exchange is an available option for Mainland China', '中国大陆：这两家都不作为可用选项'),
    blockedStatus: L('Not an available option', '不作为可用选项'),
    notCompared: L('Not compared', '不比较'),
    bothAvailable: L('Both recorded as available', '当前均记录为可用'),
    bothUnavailable: L('Neither is recorded as available', '当前均未记录为可用'),
    unknownAvailability: L('Not enough information', '资料不足'),
    exclude: L('Exclude {name} for this region first', '先排除 {name}'),
    candidate: L('{name} is the remaining candidate, but verify on its official site before registering.', '这两家里只剩 {name} 可以继续比较，注册前还要看官网的最新地区规则。'),
    unavailable: L('Not recorded as available', '当前记录不可用'),
    available: L('Recorded as available', '当前记录可用'),
    lower: L('{name} has the lower published base cost by {saving} USDT', '{name} 的基础费用少 {saving} USDT'),
    tie: L('Published base costs are the same under these inputs', '按当前条件计算，两家的基础费用一样'),
    cannotConclude: L('Availability is not confirmed, so no winner is declared', '能否使用还没确认，暂时不判断哪家更合适'),
    verifyRegion: L('Verify regional access and product availability on both official sites.', 'FeeEye 目前资料不足，先不要注册；请查看两家官网的最新地区规则。'),
    tradeOnly: L('No withdrawal included', '这次不提币'),
    noCommon: L('No comparable common network', '没有公开可比的共同网络费用'),
    autoNetwork: L('lowest common example', '自动选择费用最低的共同网络'),
    market: L('buy-now order', '直接买入'),
    limit: L('price-set order', '挂单等待成交'),
    same: L('Same fee', '费用一样'),
    less: L('{name} lower by {saving}', '{name} 少 {saving} USDT'),
    feeUnknown: L('Fee unknown', '费用未知'),
    cannotCostCompare: L('Withdrawal fees are not comparable, so only trading fees are shown', '提币费没有公开可比数据，只展示交易费，不判断完整成本'),
    dynamic: L('estimated', '动态估算'),
    costScope: L('This is a published base-cost comparison only. Funding fees, spread and slippage are not included; confirm the final quote before acting.', '这里只比较公开基础成本，不包含入金费、价差和滑点；操作前请核对最终报价。')
  }).replace(/</g, '\\u003c');

  const advancedRows = [
    [L('Futures taker (base)', '合约立即成交费率'), pct(a.futures.taker), pct(b.futures.taker)],
    [L('Maximum displayed leverage', '最高杠杆'), `${EXCHANGE_COMPARE[slugA]?.max_leverage || '—'}×`, `${EXCHANGE_COMPARE[slugB]?.max_leverage || '—'}×`],
    [L('Margin trading', '杠杆交易'), EXCHANGE_COMPARE[slugA]?.has_margin ? '✓' : '✗', EXCHANGE_COMPARE[slugB]?.has_margin ? '✓' : '✗'],
    [L('Options', '期权'), EXCHANGE_COMPARE[slugA]?.has_options ? '✓' : '✗', EXCHANGE_COMPARE[slugB]?.has_options ? '✓' : '✗'],
    [L('Trading bot', '交易机器人'), a.has_trading_bot ? '✓' : '✗', b.has_trading_bot ? '✓' : '✗'],
    [L('Copy trading', '跟单交易'), a.has_copy_trading ? '✓' : '✗', b.has_copy_trading ? '✓' : '✗'],
    [L('API', 'API'), a.has_api ? '✓' : '✗', b.has_api ? '✓' : '✗']
  ].map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('');

  const facts = (slug, ex) => {
    const cd = EXCHANGE_COMPARE[slug] || {};
    const sourceLink = (key, label) => ex.evidence?.[key]?.url ? `<a href="${esc(ex.evidence[key].url)}" rel="noopener" target="_blank">${esc(label)} · ${esc(ex.evidence[key].checked_at || '')}</a>` : '';
    return `<article class="compare-fact"><h3>${esc(ex.name)}</h3><dl>
      <dt>${esc(L('KYC', '身份验证'))}</dt><dd>${esc(cd.kyc?.[lang] || '—')}</dd>
      <dt>${esc(L('Licences', '牌照/注册信息'))}</dt><dd>${esc(cd.licenses?.[lang] || '—')}</dd>
      <dt>${esc(L('Reserve disclosure', '储备披露'))}</dt><dd>${esc(cd.reserve?.[lang] || '—')}</dd>
      <dt>${esc(L('Incident record', '重大事件记录'))}</dt><dd>${esc(cd.incident?.[lang] || '—')}</dd>
      <dt>${esc(L('CoinGecko trust', 'CoinGecko 信任分'))}</dt><dd>${cd.trust != null ? `${esc(String(cd.trust))}/10` : '—'}</dd>
      <dt>${esc(L('Tracked spot assets', '现货币种数'))}</dt><dd>${cd.coins != null ? esc(String(cd.coins)) : '—'}</dd>
    </dl><div class="compare-source-links">${sourceLink('kyc', L('KYC source', 'KYC 来源'))}${sourceLink('regulation', L('Licence source', '牌照来源'))}${sourceLink('reserves', L('Reserve source', '储备来源'))}</div></article>`;
  };

  const body = `<main class="compare-page">
  <section class="compare-hero">
    <div class="compare-kicker">${esc(L(`Decision guide · snapshot ${UPD}`, `新手决策指南 · 数据快照 ${UPD}`))}</div>
    <h1>${esc(`${a.name} vs ${b.name}${zh ? '：第一次使用怎么选' : ': what matters for a first-time user'}`)}</h1>
    <p class="compare-lead">${esc(verdictLead)}</p>
    <div class="compare-guard">
      <div><b>${esc(L('1. Can you use it?', '1. 先看能不能用'))}</b><span>${esc(L('Region, KYC and fiat methods can override every fee result.', '地区不支持，费用再低也没有意义。'))}</span></div>
      <div><b>${esc(L('2. What is the full path?', '2. 再算这次要花多少'))}</b><span>${esc(L('Funding + spread + trade + withdrawal, not trading fee alone.', '入金、交易和提币要分开看。'))}</span></div>
      <div><b>${esc(L('3. Can you withdraw safely?', '3. 最后确认提币网络'))}</b><span>${esc(L('The receiving wallet must support the exact same network.', '转出和接收必须选同一条链。'))}</span></div>
    </div>
  </section>

  <section class="compare-decider" aria-labelledby="cpDeciderTitle">
    <div class="compare-decider-head"><h2 id="cpDeciderTitle">${esc(L('Tell us what you actually need', '按你的情况算一遍'))}</h2><p>${esc(L('Four plain-language choices are enough. We use them only in your browser and do not save the values.', '下面的选择只用于本页计算，不上传，也不保存。'))}</p></div>
    <div class="compare-questions">
      <label class="compare-question"><span>${esc(L('1. Where do you live?', '1. 你目前常住哪里？'))}</span><select id="cpCountry"><option value="">${esc(L('Select a region first', '先选国家或地区'))}</option>${regionOptions}</select></label>
      <label class="compare-question"><span>${esc(L('2. About how much will you buy?', '2. 准备买多少 USDT？'))}</span><input id="cpAmount" type="number" min="1" max="10000000" step="1" value="1000" inputmode="decimal"></label>
      <label class="compare-question"><span>${esc(L('3. How do you want the order filled?', '3. 你打算怎么买？'))}</span><select id="cpOrder"><option value="taker">${esc(L('Buy now at the available market price', '直接按当前价格买（市价单）'))}</option><option value="maker">${esc(L('Set a price and wait for a fill', '自己定价，等待成交（限价单）'))}</option></select></label>
      <label class="compare-question"><span>${esc(L('4. Will you move USDT to a wallet?', '4. 买完要转到自己的钱包吗？'))}</span><select id="cpWithdraw"><option value="yes">${esc(L('Yes, include withdrawal cost', '要，把提币费也算进去'))}</option><option value="no">${esc(L('No, compare trading fee only', '不要，只算交易费'))}</option></select></label>
      <label id="cpNetworkQuestion" class="compare-question compare-network-question"><span>${esc(L('Which network can the receiving wallet use?', '你的钱包支持哪条链？'))}</span><select id="cpNetwork"><option value="auto">${esc(L('Not sure — show the lowest common example', '不清楚——先看双方都有且费用最低的一条'))}</option>${networkOptions}</select></label>
    </div>
    <div id="cpLiveResult" class="compare-live-result" role="status" aria-live="polite">
      <div class="eyebrow">${esc(L('Personalized snapshot', '根据你的选择'))}</div>
      <h3 id="cpLiveTitle">${esc(L('Select your region to start', '先选地区，看看这两家能不能用'))}</h3>
      <p id="cpLiveSummary">${esc(L('Regional availability is checked before any fee comparison.', '选完后会自动比较交易费和提币费。'))}</p>
      <a id="cpRegionSource" class="compare-source-links" href="#" rel="noopener" target="_blank" hidden>${esc(L('Regional source', '查看地区依据'))}</a>
      <div class="scroll"><table class="compare-live-table"><thead><tr><th>${esc(L('Item', '比较项目'))}</th><th>${esc(a.name)}</th><th>${esc(b.name)}</th><th>${esc(L('What it means', '怎么看'))}</th></tr></thead><tbody>
        <tr><td>${esc(L('Can I use it?', '能不能用'))}</td><td id="cpAvailA">—</td><td id="cpAvailB">—</td><td id="cpAvailVerdict">${esc(L('Select a region', '先选地区'))}</td></tr>
        <tr><td>${esc(L('Trading fee', '交易费'))}</td><td id="cpTradeA">—</td><td id="cpTradeB">—</td><td id="cpTradeVerdict">—</td></tr>
        <tr><td>${esc(L('Withdrawal fee', '提币费'))}</td><td id="cpWithdrawA">—</td><td id="cpWithdrawB">—</td><td id="cpWithdrawVerdict">—</td></tr>
      </tbody></table></div>
    </div>
  </section>

  <section class="compare-section">
    <div class="compare-section-head"><h2>${esc(L('Published fee evidence', '基础费率对比'))}</h2><p>${esc(L('Ordinary-user base tier; $1,000 examples exclude spread and funding costs.', '按普通用户基础费率和 1,000 USDT 计算；不包含入金费、价差和滑点。'))}</p></div>
    <div class="scroll"><table class="compare-table"><thead><tr><th>${esc(L('Scenario', '场景'))}</th><th>${esc(a.name)}</th><th>${esc(b.name)}</th><th>${esc(L('Result', '结果'))}</th></tr></thead><tbody>
      <tr><td><b>${esc(L('$1,000 market order', '直接买入'))}</b><small>${esc(L('Taker / immediate fill', '交易额 1,000 USDT，立即成交'))}</small></td><td>${esc(`${money(takerA)} · ${pct(a.spot.taker)}`)}</td><td>${esc(`${money(takerB)} · ${pct(b.spot.taker)}`)}</td><td>${esc(feeVerdict(takerA, takerB))}</td></tr>
      <tr><td><b>${esc(L('$1,000 limit order', '挂单买入'))}</b><small>${esc(L('Maker / waits on order book', '交易额 1,000 USDT，自己定价等待成交'))}</small></td><td>${esc(`${money(makerA)} · ${pct(a.spot.maker)}`)}</td><td>${esc(`${money(makerB)} · ${pct(b.spot.maker)}`)}</td><td>${esc(feeVerdict(makerA, makerB))}</td></tr>
      <tr><td><b>${esc(L('Withdraw 1,000 USDT', '提取 1,000 USDT'))}</b><small>${esc(lowCostNetwork ? L(`${lowCostNetwork} common-network example`, `${lowCostNetwork} 共同网络示例`) : L('No public comparable quote', '没有公开可比报价'))}</small></td><td>${lowCostNetwork ? esc(usd(lowA)) : '—'}</td><td>${lowCostNetwork ? esc(usd(lowB)) : '—'}</td><td>${lowCostNetwork ? esc(feeVerdict(lowA, lowB)) : esc(L('No winner', '不比较'))}</td></tr>
    </tbody></table></div>
    <div class="compare-assumption">${esc(L('Why there is no “total-cost winner” here: card/bank availability is regional and instant-buy spread is not in the current dataset. Claiming a total winner would be false precision.', '这里不算“真实总成本”：银行卡、转账通道和即时买币价差会随地区变化，当前没有足够数据，不能硬给一个总价排名。'))}</div>
    ${feeEvidenceHtml}
  </section>

  <section class="compare-section">
    <div class="compare-section-head"><h2>${esc(L('Funding methods: check availability before fees', '入金方式和费用'))}</h2><p>${esc(L('Published indicative ranges; providers and regions can change the final quote.', '是否支持、实际收多少，会随地区和支付服务商变化。'))}</p></div>
    <div class="compare-methods">
      <article class="compare-method"><h3>${esc(a.name)}</h3><ul>${(a.deposit_methods || []).map((d) => `<li>${methodLabel(d)}</li>`).join('')}</ul></article>
      <article class="compare-method"><h3>${esc(b.name)}</h3><ul>${(b.deposit_methods || []).map((d) => `<li>${methodLabel(d)}</li>`).join('')}</ul></article>
    </div>
  </section>

  <section class="compare-section">
    <div class="compare-section-head"><h2>${esc(L('1,000 USDT withdrawal on networks both support', '把 1,000 USDT 转到钱包：共同网络费用'))}</h2><p>${esc(L('Fees are fixed or dynamic exchange quotes, not blockchain guarantees. Test with a small amount first.', '有些提币费会变动，下面只是当前快照；第一次转账建议先小额测试。'))}${withdrawalProcessingNote ? ` ${esc(withdrawalProcessingNote)}` : ''}</p></div>
    <div class="scroll"><table class="compare-table"><thead><tr><th>${esc(L('Network', '网络'))}</th><th>${esc(a.name)}</th><th>${esc(b.name)}</th><th>${esc(L('Snapshot result', '哪家更省'))}</th></tr></thead><tbody>${networkRows || `<tr><td colspan="4">${esc(L('No common network recorded', '没有公开可比的共同网络费用'))}</td></tr>`}</tbody></table></div>
  </section>

  <section class="compare-section">
    <div class="compare-section-head"><h2>${esc(L('Trust facts to verify before opening an account', '注册前要看的安全与合规信息'))}</h2><p>${esc(L('Facts are shown separately so one editorial score cannot hide a licence gap or past incident.', '牌照、储备和历史事件分开列，不用一个“安全分”替你做判断。'))}</p></div>
    <div class="compare-facts">${facts(slugA, a)}${facts(slugB, b)}</div>
  </section>

  <section class="compare-section">
    <details class="compare-advanced"><summary>${esc(L('Advanced / high-risk trading capabilities (not needed for a first purchase)', '更多交易功能（高风险，新手第一次买币用不到）'))}</summary><div class="scroll"><table class="compare-table"><thead><tr><th>${esc(L('Capability', '功能'))}</th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead><tbody>${advancedRows}</tbody></table></div></details>
    <div id="cpCompareActions" class="compare-actions" hidden>${ctaHtml(slugA, esc(T(lang, 'ctaOpenOn', { x: a.name })), lang)}${ctaHtml(slugB, esc(T(lang, 'ctaOpenOn', { x: b.name })), lang)}</div>
    <p class="compare-source-note">${esc(L('Research basis: a 395-person investor/potential-investor survey, interviews with 15 Chinese exchange users, public beginner forum discussions and tutorial-video topic analysis. This is qualitative evidence, not FeeEye behavioural analytics.', '为什么这样设计：参考395人调查、15名中国用户访谈，以及公开的新手论坛和教程视频。这些是外部定性证据，不是FeeEye自己的用户统计。'))} <a href="https://uwspace.uwaterloo.ca/items/49452a36-424c-4758-9f99-932eba2454ac" rel="noopener" target="_blank">${esc(L('395-person study', '395人调查'))}</a> · <a href="https://arxiv.org/abs/2204.08664" rel="noopener" target="_blank">${esc(L('China interview study', '中国用户访谈'))}</a></p>
  </section>
  </main>
  <script>
  (function(){
    var DATA=${decisionJson};
    var TEXT=${decisionText};
    var country=document.getElementById('cpCountry');
    var amount=document.getElementById('cpAmount');
    var order=document.getElementById('cpOrder');
    var withdraw=document.getElementById('cpWithdraw');
    var network=document.getElementById('cpNetwork');
    var networkQuestion=document.getElementById('cpNetworkQuestion');
    var title=document.getElementById('cpLiveTitle');
    var summary=document.getElementById('cpLiveSummary');
    var regionSource=document.getElementById('cpRegionSource');
    var compareActions=document.getElementById('cpCompareActions');
    var actionLinks=compareActions.querySelectorAll('a');
    var availAEl=document.getElementById('cpAvailA'),availBEl=document.getElementById('cpAvailB'),availVerdict=document.getElementById('cpAvailVerdict');
    var tradeAEl=document.getElementById('cpTradeA'),tradeBEl=document.getElementById('cpTradeB'),tradeVerdict=document.getElementById('cpTradeVerdict');
    var withdrawAEl=document.getElementById('cpWithdrawA'),withdrawBEl=document.getElementById('cpWithdrawB'),withdrawVerdict=document.getElementById('cpWithdrawVerdict');
    function fill(value,key,replacement){return value.replace('{'+key+'}',replacement);}
    function num(value){return Number(value).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
    function quote(ex,net,value){
      var fee=ex.withdrawal_fees&&ex.withdrawal_fees[net];
      if(!fee||fee.amount==null) return null;
      var processing=ex.withdrawal_processing;
      var processingFee=processing?Math.min(value*processing.rate,processing.cap):0;
      return {total:fee.amount+processingFee,estimated:String(fee.model||'').indexOf('dynamic')!==-1};
    }
    function cheapest(value){
      var best=null;
      DATA.networks.forEach(function(net){
        var qa=quote(DATA.a,net,value),qb=quote(DATA.b,net,value);
        if(!qa||!qb)return;
        var score=Math.max(qa.total,qb.total);
        if(!best||score<best.score)best={network:net,score:score,qa:qa,qb:qb};
      });
      return best;
    }
    function avail(record,key){
      if(!record)return null;
      if(record.restricted)return null;
      return record[key]===true?true:(record[key]===false?false:null);
    }
    function render(){
      var cc=country.value;
      var value=Math.max(1,Number(amount.value)||1000);
      var orderType=order.value;
      var includeWithdrawal=withdraw.value==='yes';
      compareActions.hidden=true;for(var actionIndex=0;actionIndex<actionLinks.length;actionIndex++)actionLinks[actionIndex].hidden=false;
      [availAEl,availBEl,availVerdict,tradeAEl,tradeBEl,tradeVerdict,withdrawAEl,withdrawBEl,withdrawVerdict].forEach(function(el){el.className='';});
      networkQuestion.hidden=!includeWithdrawal||DATA.networks.length===0;
      var tradeA=value*DATA.a.spot[orderType],tradeB=value*DATA.b.spot[orderType];
      tradeAEl.textContent=num(tradeA)+' USDT';tradeBEl.textContent=num(tradeB)+' USDT';
      tradeVerdict.textContent=Math.abs(tradeA-tradeB)<0.000001?TEXT.same:fill(fill(TEXT.less,'name',tradeA<tradeB?DATA.a.name:DATA.b.name),'saving',num(Math.abs(tradeA-tradeB)));
      var wdA=0,wdB=0,withdrawComparable=!includeWithdrawal;
      if(includeWithdrawal){
        var selected=network.value;
        var qa,qb,net;
        if(selected==='auto'){
          var best=cheapest(value);
          if(best){net=best.network;qa=best.qa;qb=best.qb;}
        }else{net=selected;qa=quote(DATA.a,net,value);qb=quote(DATA.b,net,value);}
        if(qa&&qb){
          wdA=qa.total;wdB=qb.total;withdrawComparable=true;
          withdrawAEl.textContent=(qa.estimated?'~':'')+num(wdA)+' USDT';withdrawBEl.textContent=(qb.estimated?'~':'')+num(wdB)+' USDT';
          withdrawVerdict.textContent=(selected==='auto'?net+' · ':'')+(Math.abs(wdA-wdB)<0.000001?TEXT.same:fill(fill(TEXT.less,'name',wdA<wdB?DATA.a.name:DATA.b.name),'saving',num(Math.abs(wdA-wdB))));
        }else{withdrawAEl.textContent=TEXT.feeUnknown;withdrawBEl.textContent=TEXT.feeUnknown;withdrawVerdict.textContent=TEXT.noCommon;}
      }else{withdrawAEl.textContent='—';withdrawBEl.textContent='—';withdrawVerdict.textContent=TEXT.tradeOnly;}
      if(!cc){
        title.textContent=TEXT.selectRegion;summary.textContent=TEXT.regionFirst;availAEl.textContent=TEXT.waiting;availBEl.textContent=TEXT.waiting;availVerdict.textContent=TEXT.regionFirst;return;
      }
      var record=DATA.availability[cc];
      regionSource.hidden=!(record&&record.source);if(record&&record.source)regionSource.href=record.source;
      if(record&&record.decision==='blocked'){
        title.textContent=TEXT.blockedTitle;summary.textContent=record.note||TEXT.blockedTitle;
        availAEl.textContent=TEXT.blockedStatus;availBEl.textContent=TEXT.blockedStatus;availVerdict.textContent=TEXT.notCompared;
        [availAEl,availBEl,availVerdict].forEach(function(el){el.className='blocked';});
        tradeAEl.textContent='—';tradeBEl.textContent='—';tradeVerdict.textContent=TEXT.notCompared;
        withdrawAEl.textContent='—';withdrawBEl.textContent='—';withdrawVerdict.textContent=TEXT.notCompared;return;
      }
      if(record&&record.restricted){
        title.textContent=TEXT.regionNotCovered;summary.textContent=TEXT.verifyRegion;availAEl.textContent=TEXT.unknownAvailability;availBEl.textContent=TEXT.unknownAvailability;availVerdict.textContent=TEXT.notCompared;return;
      }
      var aa=avail(record,'a'),ab=avail(record,'b');
      availAEl.textContent=aa===true?TEXT.available:(aa===false?TEXT.unavailable:TEXT.unknownAvailability);availBEl.textContent=ab===true?TEXT.available:(ab===false?TEXT.unavailable:TEXT.unknownAvailability);
      if(aa===false&&ab===false){title.textContent=TEXT.bothUnavailable;summary.textContent=record&&record.note?record.note:TEXT.verifyRegion;availVerdict.textContent=TEXT.notCompared;return;}
      if(aa===false&&ab===true){title.textContent=fill(TEXT.exclude,'name',DATA.a.name);summary.textContent=fill(TEXT.candidate,'name',DATA.b.name);availVerdict.textContent=fill(TEXT.exclude,'name',DATA.a.name);compareActions.hidden=false;if(actionLinks[0])actionLinks[0].hidden=true;return;}
      if(ab===false&&aa===true){title.textContent=fill(TEXT.exclude,'name',DATA.b.name);summary.textContent=fill(TEXT.candidate,'name',DATA.a.name);availVerdict.textContent=fill(TEXT.exclude,'name',DATA.b.name);compareActions.hidden=false;if(actionLinks[1])actionLinks[1].hidden=true;return;}
      if(aa!==true||ab!==true){title.textContent=TEXT.cannotConclude;summary.textContent=TEXT.verifyRegion;availVerdict.textContent=TEXT.notCompared;return;}
      availVerdict.textContent=TEXT.bothAvailable;
      compareActions.hidden=false;
      if(!withdrawComparable){title.textContent=TEXT.cannotCostCompare;summary.textContent=TEXT.costScope;return;}
      var totalA=tradeA+wdA,totalB=tradeB+wdB;
      if(Math.abs(totalA-totalB)<0.000001)title.textContent=TEXT.tie;
      else{
        var lower=totalA<totalB?DATA.a.name:DATA.b.name;
        title.textContent=fill(fill(TEXT.lower,'name',lower),'saving',num(Math.abs(totalA-totalB)));
      }
      summary.textContent=TEXT.costScope;
    }
    [country,amount,order,withdraw,network].forEach(function(control){control.addEventListener(control.tagName==='INPUT'?'input':'change',render);});
    render();
  })();
  </script>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: T(lang, 'cpQ1', { a: a.name, b: b.name }), answer: { '@type': 'Answer', text: L(`There is no universal winner. At the base tier, a $1,000 market order costs ${money(takerA)} on ${a.name} and ${money(takerB)} on ${b.name}; funding, spread, region and withdrawal route can change the result. Snapshot ${UPD}.`, `没有统一赢家。基础档 1,000 美元市价单在 ${a.name} 的手续费为 ${money(takerA)}，在 ${b.name} 为 ${money(takerB)}；入金、价差、地区与提币路径会改变结果。数据快照 ${UPD}。`) } }]
  };
  return page({ lang, title: T(lang, 'cpTitle', { a: a.name, b: b.name }), desc: T(lang, 'cpDesc', { a: a.name, b: b.name }), body, jsonLd, path: `${lang === 'zh' ? 'zh/' : ''}compare/${slugA}-vs-${slugB}.html`, affiliate: false });
}

function countryPage(cc, lang) {
  const info = CA[cc];
  const name = COUNTRY_NAMES[cc] || cc;
  const avail = Object.keys(EX).filter((s) => info.exchanges[s]);
  const rows = avail.map((slug) => {
    const ex = EX[slug];
    const cta = ctaHtml(slug, esc(T(lang, 'ctaOpenOn', { x: ex.name })), lang);
    return `<tr><td><b>${ex.name}</b></td><td>${pct(ex.spot.taker)}</td><td>${usd(getFee(slug, 'TRC20'))}</td><td>${cta}</td></tr>`;
  }).join('');
  const body = `
  <h1>${esc(T(lang, 'cyH1', { n: name }))}</h1>
  <p class="intro">${esc(T(lang, 'cyIntro', { n: name }))}</p>
  <div class="note">${esc(T(lang, 'cyNote', { n: name, r: RESTRICTED_LABEL }))}</div>
  <div class="scroll"><table><thead><tr><th>${esc(T(lang, 'thExchange'))}</th><th>${esc(T(lang, 'thTaker'))}</th><th>${esc(T(lang, 'thFee20'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="intro">${esc(T(lang, 'cyUse'))}</p>`;
  return page({ lang, title: T(lang, 'cyTitle', { n: name }), desc: T(lang, 'cyDesc', { n: name }), body, depth: lang === 'zh' ? 2 : 1, path: `${lang === 'zh' ? 'zh/' : ''}${cc.toLowerCase()}/exchanges.html`, affiliate: false, noDisc: true, noIndex: !!info.restricted });
}

function indexPage(lang) {
  const p = (rel) => absPath(lang, rel);
  // 搜索框：同时支持代号、英文名和常见中文别名。
  const normalizeSearch = (s) => String(s || '').toLowerCase().replace(/[\s_\-]+/g, '');
  const searchMap = {};
  COIN_LIST.forEach((c) => {
    searchMap[normalizeSearch(c.symbol)] = c.symbol;
    searchMap[normalizeSearch(c.name)] = c.symbol;
  });
  const zhAliases = { '比特币': 'BTC', '以太坊': 'ETH', '币安币': 'BNB', '瑞波币': 'XRP', '索拉纳': 'SOL', '波场': 'TRX', '狗狗币': 'DOGE', '柴犬币': 'SHIB', '莱特币': 'LTC' };
  Object.keys(zhAliases).forEach((name) => { if (searchMap[normalizeSearch(zhAliases[name])]) searchMap[normalizeSearch(name)] = zhAliases[name]; });
  const searchKeysBySymbol = {};
  Object.entries(searchMap).forEach(([key, symbol]) => {
    if (!searchKeysBySymbol[symbol]) searchKeysBySymbol[symbol] = [];
    searchKeysBySymbol[symbol].push(key);
  });
  const coinSearchItems = COIN_LIST.map((c) => ({ symbol: c.symbol, name: c.name, keys: searchKeysBySymbol[c.symbol] || [], rank: c.rank || 999999, category: catOf(c) }));
  const searchPh = lang === 'zh' ? '搜索币种，如 BTC、ETH、SOL' : 'Search a coin, e.g. BTC, ETH, SOL';
  const searchBtn = lang === 'zh' ? '搜索' : 'Search';
  const searchNf = lang === 'zh' ? '未找到该币种，请检查币种代号' : 'Coin not found — check the ticker';
  const searchPopular = lang === 'zh' ? '热门币种' : 'Popular coins';
  const searchMatch = lang === 'zh' ? '匹配结果' : 'Matching coins';
  const searchOpen = lang === 'zh' ? '查看' : 'Open';
  const searchEmptyTitle = lang === 'zh' ? '没有找到匹配币种' : 'No matching coin found';
  const searchEmptyTip = lang === 'zh' ? '试试币种简称或英文全名，如 BTC、Bitcoin' : 'Try a ticker or full name, such as BTC or Bitcoin';
  const body = `
  <h1>${esc(T(lang, 'idxH1'))}</h1>
  <p class="intro">${esc(T(lang, 'idxIntro'))}</p>
  <div class="beginner-path">
    <b>${lang === 'zh' ? '第一次使用 Crypto？按这个顺序开始' : 'New to crypto? Start in this order'}</b>
    <ol>
      <li><a href="${p(gloPath(lang))}">${lang === 'zh' ? '先看懂常用术语和风险' : 'Learn the basic terms and risks'}</a></li>
      <li><a href="${p(cmpPath(lang))}">${lang === 'zh' ? '再比较交易所的费用、可用性与安全信息' : 'Compare exchange costs, availability and security information'}</a></li>
      <li><a href="${p(tcPath(lang))}">${lang === 'zh' ? '估算入金、交易和提币基础成本' : 'Estimate deposit, trading and withdrawal costs'}</a></li>
      <li>${lang === 'zh' ? '最后到交易所官网核对所在地区、费率和提币网络' : 'Finally verify your region, fees and withdrawal network on the exchange itself'}</li>
    </ol>
  </div>
  <div id="idxCoinSearch" class="coin-search">
    <div class="coin-search-row">
      <div class="coin-search-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="idxCoinInput" class="coin-search-input" type="search" placeholder="${searchPh}" autocomplete="off" autocapitalize="characters" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="idxCoinSuggestions">
        <button id="idxSearchClear" class="coin-search-clear" type="button" aria-label="${lang === 'zh' ? '清空搜索' : 'Clear search'}">×</button>
      </div>
      <button id="idxSearchBtn" class="coin-search-submit" type="button">${searchBtn}</button>
    </div>
    <div id="idxCoinSuggestions" class="coin-suggestions" role="listbox" aria-label="${lang === 'zh' ? '币种搜索结果' : 'Coin search results'}"></div>
    <p id="idxSearchMsg" class="search-msg" role="status" aria-live="polite">${searchNf}</p>
  </div>
  <div class="grid">
    <div class="card"><a class="card-title" href="${p(tcPath(lang))}"><span class="ic">${ICON.receipt}</span><b>${esc(T(lang, 'idxTcT'))}</b></a><br>${esc(T(lang, 'idxTcB'))}<br><a href="${p(tcPath(lang))}">${esc(T(lang, 'idxTcC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(futPath(lang))}"><span class="ic">${ICON.trend}</span><b>${esc(T(lang, 'idxFutT'))}<span class="risk-tag">${lang === 'zh' ? '高风险' : 'High risk'}</span></b></a><br>${esc(T(lang, 'idxFutB'))}<br><a href="${p(futPath(lang))}">${esc(T(lang, 'idxFutC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(cmpPath(lang))}"><span class="ic">${ICON.scale}</span><b>${esc(T(lang, 'idxCmpT'))}</b></a><br>${esc(T(lang, 'idxCmpB'))}<br><a href="${p(cmpPath(lang))}">${esc(T(lang, 'idxCmpC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(secPath(lang))}"><span class="ic">${ICON.shield}</span><b>${esc(T(lang, 'idxSecT'))}</b></a><br>${esc(T(lang, 'idxSecB'))}<br><a href="${p(secPath(lang))}">${esc(T(lang, 'idxSecC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(pfPath(lang))}"><span class="ic">${ICON.wallet}</span><b>${esc(T(lang, 'idxPfT'))}</b></a><br>${esc(T(lang, 'idxPfB'))}<br><a href="${p(pfPath(lang))}">${esc(T(lang, 'idxPfC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(gloPath(lang))}"><span class="ic">${ICON.coins}</span><b>${esc(T(lang, 'idxGloT'))}</b></a><br>${esc(T(lang, 'idxGloB'))}<br><a href="${p(gloPath(lang))}">${esc(T(lang, 'idxGloC'))}</a></div>
  </div>
  <script>
  (function(){
    var SEARCH = ${JSON.stringify(searchMap)};
    var ITEMS = ${JSON.stringify(coinSearchItems)};
    var PREFIX = ${JSON.stringify(p('where-to-buy/'))};
    var NF = ${JSON.stringify(searchNf)};
    var POPULAR = ${JSON.stringify(searchPopular)};
    var MATCH = ${JSON.stringify(searchMatch)};
    var OPEN = ${JSON.stringify(searchOpen)};
    var EMPTY_TITLE = ${JSON.stringify(searchEmptyTitle)};
    var EMPTY_TIP = ${JSON.stringify(searchEmptyTip)};
    var root = document.getElementById('idxCoinSearch');
    var input = document.getElementById('idxCoinInput');
    var popup = document.getElementById('idxCoinSuggestions');
    var clear = document.getElementById('idxSearchClear');
    var msg = document.getElementById('idxSearchMsg');
    var results = [];
    var active = -1;
    function norm(v){ return String(v||'').trim().toLowerCase().replace(/[\\s_\\-]+/g,''); }
    function close(){ popup.classList.remove('open'); input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); active=-1; }
    function setActive(next){
      var options = popup.querySelectorAll('.coin-suggestion');
      if(!options.length) return;
      active = (next + options.length) % options.length;
      for(var i=0;i<options.length;i++) options[i].classList.toggle('active',i===active);
      options[active].scrollIntoView({block:'nearest'});
      input.setAttribute('aria-activedescendant',options[active].id);
    }
    function openCoin(symbol){ location.href = PREFIX + symbol.toLowerCase() + '.html'; }
    function render(){
      var q = norm(input.value);
      results = ITEMS.filter(function(item){
        if(!q) return true;
        for(var i=0;i<item.keys.length;i++) if(item.keys[i].indexOf(q)!==-1) return true;
        return false;
      }).sort(function(x,y){
        if(!q) return x.rank-y.rank;
        function score(item){
          var symbol=norm(item.symbol), name=norm(item.name);
          if(symbol===q) return 0;
          if(symbol.indexOf(q)===0) return 1;
          if(name===q) return 2;
          if(name.indexOf(q)===0) return 3;
          return 4;
        }
        return score(x)-score(y) || x.rank-y.rank;
      }).slice(0,7);
      popup.textContent='';
      var hint=document.createElement('div'); hint.className='coin-search-hint'; hint.textContent=q?MATCH:POPULAR; popup.appendChild(hint);
      results.forEach(function(item,index){
        var option=document.createElement('button'); option.type='button'; option.className='coin-suggestion'; option.id='coin-option-'+index; option.setAttribute('role','option'); option.dataset.symbol=item.symbol;
        var icon=document.createElement('span'); icon.className='coin-suggestion-icon cat-'+item.category; icon.textContent=item.symbol.slice(0,2); icon.setAttribute('aria-hidden','true');
        var symbol=document.createElement('span'); symbol.className='coin-suggestion-symbol'; symbol.textContent=item.symbol;
        var name=document.createElement('span'); name.className='coin-suggestion-name'; name.textContent=item.name;
        var action=document.createElement('span'); action.className='coin-suggestion-action'; action.textContent=OPEN+' →';
        option.appendChild(icon); option.appendChild(symbol); option.appendChild(name); option.appendChild(action);
        option.addEventListener('mousedown',function(e){e.preventDefault(); openCoin(item.symbol);});
        popup.appendChild(option);
      });
      active=-1;
      if(!results.length){
        var empty=document.createElement('div'); empty.className='coin-search-empty';
        var title=document.createElement('b'); title.textContent=EMPTY_TITLE;
        var tip=document.createElement('span'); tip.textContent=EMPTY_TIP;
        empty.appendChild(title); empty.appendChild(tip); popup.appendChild(empty);
      }
      popup.classList.add('open'); input.setAttribute('aria-expanded','true');
    }
    function go(){
      var key = norm(input.value);
      var symbol = SEARCH[key];
      if(!key) { msg.textContent = NF; msg.style.display = 'block'; input.focus(); return; }
      if(symbol) { openCoin(symbol); }
      else { msg.textContent = NF; msg.style.display = 'block'; input.setAttribute('aria-invalid','true'); }
    }
    document.getElementById('idxSearchBtn').addEventListener('click', go);
    input.addEventListener('focus',render);
    input.addEventListener('input',function(){ this.removeAttribute('aria-invalid'); msg.style.display='none'; clear.style.display=this.value?'block':'none'; render(); });
    input.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){e.preventDefault(); if(!popup.classList.contains('open')) render(); setActive(active+1);}
      else if(e.key==='ArrowUp'){e.preventDefault(); if(!popup.classList.contains('open')) render(); setActive(active-1);}
      else if(e.key==='Enter'){e.preventDefault(); if(active>=0&&results[active]) openCoin(results[active].symbol); else go();}
      else if(e.key==='Escape') close();
    });
    clear.addEventListener('click',function(){input.value='';this.style.display='none';msg.style.display='none';input.removeAttribute('aria-invalid');input.focus();render();});
    document.addEventListener('click',function(e){if(!root.contains(e.target)) close();});
  })();
  </script>`;
  return page({ lang, title: T(lang, 'idxTitle'), desc: T(lang, 'idxDesc'), body, path: `${lang === 'zh' ? 'zh/' : ''}index.html`, affiliate: false, noDisc: true, noHomeFoot: true });
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
  // 对比页：7 所两两全组合（字母序），共 C(7,2)=21 页，保证「X vs Y」长尾流量
  const exSlugs = Object.keys(EX).sort();
  for (let i = 0; i < exSlugs.length; i++) {
    for (let j = i + 1; j < exSlugs.length; j++) {
      write(`${lang === 'zh' ? 'zh/' : ''}compare/${exSlugs[i]}-vs-${exSlugs[j]}.html`, comparePage(exSlugs[i], exSlugs[j], lang)); count++;
    }
  }
  for (const cc of Object.keys(CA)) {
    write(`${lang === 'zh' ? 'zh/' : ''}${cc.toLowerCase()}/exchanges.html`, countryPage(cc, lang)); count++;
  }
  for (const key of ['privacy', 'terms', 'disclosure']) {
    write(`${lang === 'zh' ? 'zh/' : ''}${key}.html`, legalPage(key, lang)); count++;
  }
  write(`${lang === 'zh' ? 'zh/' : ''}about.html`, aboutPage(lang)); count++;
  write(`${lang === 'zh' ? 'zh/' : ''}coins.html`, coinsPage(lang)); count++;
}

// 拷贝工具与数据，使站内计算器可用（en 根 + zh 双语目录各一份，工具页以 ../data/ 相对引用）
fs.cpSync(toolsDir, path.join(distDir, 'tools'), { recursive: true });
fs.cpSync(dataDir, path.join(distDir, 'data'), { recursive: true });
fs.cpSync(toolsDir, path.join(distDir, 'zh', 'tools'), { recursive: true });
fs.cpSync(dataDir, path.join(distDir, 'zh', 'data'), { recursive: true });
// 生成 coin-prices.js：供工具页做币种计价（价格来自 coins.json 的 CoinGecko 快照）
const priceMap = {};
for (const c of COIN_LIST) {
  if (c.price != null && c.price > 0) priceMap[c.symbol] = { name: c.name, price: c.price, rank: c.rank, cg_id: c.cg_id || '' };
}
const coinPricesJs = `window.COIN_PRICES = ${JSON.stringify(priceMap)};\nwindow.COIN_PRICE_META = ${JSON.stringify({ updated: COIN_SNAPSHOT, source: 'CoinGecko' })};`;
// 生成 coin-ids.js：symbol → cg_id 映射（供记账本等工具拉实时价格）
const coinIds = {};
for (const c of COIN_LIST) {
  if (c.cg_id) coinIds[c.symbol] = c.cg_id;
}
const coinIdsJs = `window.COIN_IDS = ${JSON.stringify(coinIds)};`;
fs.writeFileSync(path.join(distDir, 'data', 'coin-prices.js'), coinPricesJs);
fs.writeFileSync(path.join(distDir, 'zh', 'data', 'coin-prices.js'), coinPricesJs);
fs.writeFileSync(path.join(distDir, 'data', 'coin-ids.js'), coinIdsJs);
fs.writeFileSync(path.join(distDir, 'zh', 'data', 'coin-ids.js'), coinIdsJs);
// 拷贝 logo / favicon 到 dist 根（en + zh 通过绝对路径 /assets/ 共用一份）
fs.cpSync(assetsDir, path.join(distDir, 'assets'), { recursive: true });

// sitemap.xml + robots.txt
const today = new Date().toISOString().slice(0, 10);
// sitemap URL 去掉 .html 后缀 + index.html → 根，与页面 canonical 保持一致，避免谷歌拿到矛盾信号
const pages = urls.filter((u) => u.endsWith('.html')).map(canonPath);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((u) => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// Cloudflare Pages _headers（放在 build output 目录 dist/，Pages 部署时读取）
// - HTML 不写规则，走 Cloudflare Pages 默认（public, max-age=0, must-revalidate），保证新鲜
// - assets 静态资源长缓存；data 快照短缓存；sitemap/robots 不缓存保证爬虫拿最新
write('_headers', [
  '/assets/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
  '/data/*',
  '  Cache-Control: public, max-age=300',
  '',
  '/sitemap.xml',
  '  Cache-Control: no-cache',
  '',
  '/robots.txt',
  '  Cache-Control: no-cache',
  ''
].join('\n'));

// 404 兜底页（绝对链接，防止任何相对链接在错误路径下继续叠层）；en/zh 各一份纯语言模板
const hotCoins = [...COIN_LIST].sort((a, b) => a.rank - b.rank).slice(0, 10).map((c) => `<a href="/where-to-buy/${c.symbol.toLowerCase()}.html">${c.symbol}</a>`).join(' · ');
const hotCoinsZh = [...COIN_LIST].sort((a, b) => a.rank - b.rank).slice(0, 10).map((c) => `<a href="/zh/where-to-buy/${c.symbol.toLowerCase()}.html">${c.symbol}</a>`).join(' · ');
write('404.html', `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page not found — FeeEye</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;background:#f7f8fa;color:#1c2430;text-align:center;padding:80px 20px;line-height:1.9}
h1{font-size:26px;margin-bottom:8px}a{color:#2563eb;text-decoration:none;font-weight:600;margin:0 8px}</style></head>
<body>
<h1>404 — Page not found</h1>
<p>The page you are looking for does not exist.</p>
<p>Try a popular coin:<br>${hotCoins}</p>
<p><a href="/">Home</a> · <a href="/zh/">中文</a> · <a href="/tools/fee-calculator.html">Fee Calculator</a></p>
</body></html>`);
write('zh/404.html', `<!doctype html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>页面未找到 — FeeEye</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;background:#f7f8fa;color:#1c2430;text-align:center;padding:80px 20px;line-height:1.9}
h1{font-size:26px;margin-bottom:8px}a{color:#2563eb;text-decoration:none;font-weight:600;margin:0 8px}</style></head>
<body>
<h1>404 — 页面未找到</h1>
<p>您访问的页面不存在。</p>
<p>试试这些热门币：<br>${hotCoinsZh}</p>
<p><a href="/">英文首页</a> · <a href="/zh/">中文首页</a> · <a href="/zh/tools/fee-calculator.zh.html">手续费计算器</a></p>
</body></html>`);

console.log(`[OK] Generated ${count} static pages (en+zh, coins=${coinCount}, countries=${Object.keys(CA).filter((c) => !CA[c].restricted).length}) into dist/ [coverage_mode=${COVERAGE_MODE}].`);
