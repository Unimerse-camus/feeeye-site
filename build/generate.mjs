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
let UPD = ''; // 在 coins.json 读取后赋值（line 107）
const RESTRICTED_LABEL = ['US', 'CN', 'HK', 'SG'].join(', ');

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
  compare: `<svg ${SVG_ATTR}><path d="M6 9a6 6 0 0 0 12 0V3H6z"/><path d="M6 5H3v2a3 3 0 0 0 3 3"/><path d="M18 5h3v2a3 3 0 0 1-3 3"/><path d="M12 15v3"/><path d="M8 21h8"/><path d="M10 18h4"/></svg>`
};
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
    exH1: '{n} — Fees, Networks & Tools (2026)',
    exIntro: 'Snapshot of {n} trading fees, USDT withdrawal costs, supported networks and features. Data {u}.',
    exSpot: 'Spot fee', exFutures: 'Futures fee', exWd: 'USDT withdrawal', exCoins: 'Coins listed', exBot: 'Trading bot', exApi: 'API',
    exOf: '{t} listed', exBotYes: 'Available', exBotNo: 'No',
    exTitle: '{n} Fees & Data 2026',
    exDesc: '{n} fees, USDT withdrawal costs, supported networks and trading features. Compare with other exchanges.',
    exCompare: 'Compare: ',
    exTrust: 'Trust', exSec: 'Security', exPor: 'PoR', exCold: 'Cold storage',
    exFeeBlock: 'Trading fees', exTier: 'Tier', exMaker: 'Maker', exTaker: 'Taker', exThreshold: '30d volume', exTokenDisc: 'Pay with {t} saves {r}',
    exSecBlock: 'Security & compliance', exReserve: 'Proof of reserves', exLicenses: 'Licenses', exKyc: 'KYC', exIncident: 'Security history',
    exWdBlock: 'USDT withdrawal fees', exNet: 'Network', exFee: 'Fee', exDepBlock: 'Deposit methods', exMethod: 'Method',
    exCapBlock: 'Trading capabilities', exVolume: '24h volume', exMaxLev: 'Max leverage', exOptions: 'Options', exMargin: 'Margin', exLeveragedTok: 'Leveraged tokens', exCopy: 'Copy trading',
    exNote: 'Fee snapshot — always confirm on the official exchange page.',
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
    idxTcT: 'Spot Toolbox', idxTcB: 'Spot trading tools: deposit / trading / withdrawal / total cost in one — see which exchange is cheapest.', idxTcC: 'Open tool →',
    idxFutT: 'Futures Toolbox', idxFutB: 'Futures trading tools: position sizing, liquidation price, PnL estimate, cross-exchange futures fee comparison.', idxFutC: 'Open tool →',
    idxCmpT: 'Exchange Comparison', idxCmpB: 'Compare 14 business dimensions: leverage, options, coins, liquidity, copy-trading/bots, reserves/cold storage, KYC, licenses, fiat deposits.', idxCmpC: 'Compare 14 dimensions →',
    idxGloT: 'Crypto Glossary', idxGloB: '40+ plain-language definitions of common crypto terms — from spot trading to wallet security.', idxGloC: 'Browse terms →',
    idxSecT: 'Token Security Check', idxSecB: 'Paste an Ethereum or Solana contract address to instantly detect honeypots, rug risks, tax, mint & freeze authority.', idxSecC: 'Check a token →',
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
    exH1: '{n}——费率、网络与工具（2026）',
    exIntro: '{n} 交易费率、USDT 提币成本、支持网络与功能快照。数据更新至 {u}。',
    exSpot: '现货费率', exFutures: '合约费率', exWd: 'USDT 提币', exCoins: '上架币种', exBot: '交易机器人', exApi: 'API',
    exOf: '上架 {t} 个', exBotYes: '支持', exBotNo: '不支持',
    exTitle: '{n} 费率与数据 2026',
    exDesc: '{n} 费率、USDT 提币成本、支持网络与交易功能。与其他交易所对比。',
    exCompare: '对比：',
    exTrust: '信任分', exSec: '安全分', exPor: '储备证明', exCold: '冷存储',
    exFeeBlock: '交易费率', exTier: '档位', exMaker: '挂单', exTaker: '吃单', exThreshold: '30天交易量', exTokenDisc: '用 {t} 支付省 {r}',
    exSecBlock: '安全与合规', exReserve: '储备证明', exLicenses: '牌照', exKyc: 'KYC', exIncident: '安全历史',
    exWdBlock: 'USDT 提币费', exNet: '网络', exFee: '费用', exDepBlock: '入金方式', exMethod: '方式',
    exCapBlock: '交易能力', exVolume: '24h 交易量', exMaxLev: '最大杠杆', exOptions: '期权', exMargin: '保证金', exLeveragedTok: '杠杆代币', exCopy: '跟单',
    exNote: '费率快照——交易前请以官方页面为准。',
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
    idxTcT: '现货工具箱', idxTcB: '现货交易工具：入金 / 交易 / 提币 / 全成本四合一，看清哪家交易所最便宜。', idxTcC: '打开工具 →',
    idxFutT: '合约工具箱', idxFutB: '合约交易工具：仓位计算 / 强平价 / 盈亏预估 / 各所合约费率对比。', idxFutC: '打开工具 →',
    idxCmpT: '交易所综合对比', idxCmpB: '14 个业务维度对比交易所：杠杆/期权/流动性/币种/跟单/储备/法币入金等。', idxCmpC: '14 维度对比 →',
    idxGloT: '数字货币术语解释', idxGloB: '40+ 数字货币常用术语通俗解释，从现货交易到钱包安全全覆盖。', idxGloC: '查术语 →',
    idxSecT: '代币安全检查', idxSecB: '粘贴以太坊或 Solana 合约地址，立即检测貔貅盘、Rug 风险、买卖税、增发与冻结权限。', idxSecC: '查一个代币 →',
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
      body: `<h1>Privacy Policy</h1><p class="intro">Last reviewed: 2026-08-16</p><h3>Who we are</h3><p>This policy describes how FeeEye ("we", "us") handles information on this website.</p><h3>We don\'t collect your data</h3><p>We don\'t require accounts. We don\'t collect names, emails, or any personal data. We don\'t sell data. Tool inputs (amounts, deposit methods, etc.) stay in your browser and are never transmitted to or stored by us.</p><h3>Changes</h3><p>We will update this policy and the "last reviewed" date when practices change.</p>`,
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
      body: `<h1>隐私政策</h1><p class="intro">最近审阅：2026-08-16</p><h3>我们是谁</h3><p>本政策说明 FeeEye（"我们"）如何处理本网站的信息。</p><h3>我们不收集你的数据</h3><p>我们不要求注册账号。不收集姓名、邮箱等任何个人数据。不出售数据。工具输入（金额、入金方式等）只存在你的浏览器内，绝不会上传或存储到我们服务器。</p><h3>变更</h3><p>实践发生变化时，我们会更新本政策及"最近审阅"日期。</p>`,
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
    body: `<h1>About FeeEye</h1><p class="intro">Free crypto tools &amp; exchange data — built for beginners.</p><h3>What we do</h3><p>FeeEye is a free website that helps you use crypto without getting ripped off on fees. We compare exchange fees, find where to buy any token, check withdrawal costs, and flag scam tokens — all free, no signup required.</p><h3>Our tools</h3><ul><li><b>Spot Toolbox</b> — see the full deposit → trading → withdrawal cost in one place.</li><li><b>Futures Toolbox</b> — position sizing, liquidation price and P&amp;L estimate.</li><li><b>Exchange Comparison</b> — 14 dimensions of exchanges side by side.</li><li><b>Token Security Check</b> — detect honeypots and scam tokens (Ethereum &amp; Solana).</li><li><b>Portfolio Tracker</b> — log your holdings and track profit &amp; loss, no API key needed.</li><li><b>Crypto Glossary</b> — plain-language definitions of common crypto terms.</li></ul><h3>Contact</h3><p>Questions, feedback or bug reports: <a href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p><h3>Disclaimer</h3><p>FeeEye is educational only — not financial advice. Crypto is high-risk and you may lose your capital. Always do your own research and verify data on official exchange pages.</p>`
  },
  zh: {
    title: '关于 FeeEye — 免费加密货币工具与交易所数据',
    desc: 'FeeEye 是什么、提供的免费工具、如何盈利、以及联系方式。',
    body: `<h1>关于 FeeEye</h1><p class="intro">免费加密货币工具与交易所数据——为新手打造。</p><h3>我们做什么</h3><p>FeeEye 是一个免费网站，帮你在用加密货币时不被手续费坑。我们对比交易所费率、查找任意代币在哪里买、核查提币成本、识别诈骗代币——全部免费，无需注册。</p><h3>我们的工具</h3><ul><li><b>现货工具箱</b>——入金 / 交易 / 提币全成本一目了然。</li><li><b>合约工具箱</b>——仓位计算、强平价、盈亏预估。</li><li><b>交易所综合对比</b>——14 个维度并列对比。</li><li><b>代币安全检查</b>——检测貔貅盘与诈骗代币（以太坊 &amp; Solana）。</li><li><b>持仓记账本</b>——记录持仓、追踪盈亏，无需 API Key。</li><li><b>数字货币术语解释</b>——常用术语通俗解释。</li></ul><h3>联系方式</h3><p>问题、反馈或 bug 报告：<a href="mailto:feeeyeofficial@gmail.com">feeeyeofficial@gmail.com</a></p><h3>免责声明</h3><p>FeeEye 仅供教育参考，不构成投资建议。加密货币风险极高，你可能损失全部本金。请自行做好研究，并以交易所官方页面核实数据。</p>`
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

function page({ lang, title, desc, body, jsonLd, depth = 0, path, affiliate = false, noDisc = false, noHomeFoot = false }) {
  const active = matchActiveNav(path);
  const i = I18N[lang];
  const canonical = `${SITE_URL}/${path}`;
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
<link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${SITE_URL}/${lang === 'zh' ? path.replace(/^zh\//, '') : path}">
${lang === 'zh' ? `<link rel="alternate" hreflang="zh" href="${SITE_URL}/${path}">` : `<link rel="alternate" hreflang="zh" href="${SITE_URL}/zh/${path}">`}
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
.fee-tier select{flex:1;max-width:320px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:14px;background:#fff;color:#1e293b}
.fee-rates{display:flex;gap:12px;margin-bottom:8px}
.frate{flex:1;background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px 14px}
.frate span{display:block;font-size:12px;color:var(--sub)}
.frate b{display:block;font-size:20px;color:#1e293b;margin-top:2px}
.fee-meta{font-size:12px;color:var(--sub);display:flex;gap:12px;flex-wrap:wrap}
.fee-disc{color:var(--brand);font-weight:500}
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
  const cd = EXCHANGE_COMPARE[slug] || {};
  const tiers = ex.vip_tiers || [];
  const disc = ex.token_discount;
  const cmp = Object.keys(EX).filter((s) => s !== slug).slice(0, 3);
  const cmpLinks = cmp.map((s) => {
    const [x, y] = [slug, s].sort();
    return `<a href="${absPath(lang, 'compare/' + x + '-vs-' + y + '.html')}">${ex.name} vs ${EX[s].name}</a>`;
  }).join(' · ');

  // 头部信任徽章
  const badges = [
    [T(lang, 'exTrust'), cd.trust != null ? cd.trust + '/10' : '—'],
    [T(lang, 'exSec'), cd.security != null ? cd.security + '/10' : '—'],
    [T(lang, 'exPor'), cd.reserve || '—'],
    [T(lang, 'exCold'), cd.cold || '—']
  ].map(([k, v]) => `<div class="tbadge"><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join('');

  // 费率区块（VIP 档位下拉）
  const tierOpts = tiers.map((t) => `<option value="${esc(t.t)}">${esc(t.t)} · ${esc(t.th)}</option>`).join('');
  const discHtml = disc ? `<span class="fee-disc">${esc(T(lang, 'exTokenDisc', { t: disc.token, r: Math.round(disc.rate * 100) + '%' }))}</span>` : '';

  // 提币费表格（多链）
  const wdRows = Object.entries(ex.usdt_withdrawal || {}).map(([net, fee]) => `<tr><td>${esc(net)}</td><td>${fee == null ? '—' : usd(fee)}</td></tr>`).join('');

  // 入金通道表格
  const depRows = (ex.deposit_methods || []).map((d) => `<tr><td>${esc(d.m)}</td><td>${d.fee === 0 ? '0' : (d.fee_max != null ? pct(d.fee) + ' – ' + pct(d.fee_max) : pct(d.fee))}</td></tr>`).join('');

  // 交易能力清单
  const caps = [
    [T(lang, 'exVolume'), cd.volume || '—'],
    [T(lang, 'exCoins'), cd.coins != null ? cd.coins.toLocaleString() : '—'],
    [T(lang, 'exMaxLev'), cd.max_leverage ? cd.max_leverage + 'x' : '—'],
    [T(lang, 'exOptions'), cd.has_options ? T(lang, 'exBotYes') : T(lang, 'exBotNo')],
    [T(lang, 'exMargin'), cd.has_margin ? T(lang, 'exBotYes') : T(lang, 'exBotNo')],
    [T(lang, 'exLeveragedTok'), cd.has_leveraged_tokens ? T(lang, 'exBotYes') : T(lang, 'exBotNo')],
    [T(lang, 'exCopy'), ex.has_copy_trading ? T(lang, 'exBotYes') : T(lang, 'exBotNo')],
    [T(lang, 'exBot'), ex.has_trading_bot ? T(lang, 'exBotYes') : T(lang, 'exBotNo')],
    [T(lang, 'exApi'), ex.has_api ? T(lang, 'exBotYes') : T(lang, 'exBotNo')]
  ].map(([k, v]) => `<div class="cap"><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join('');

  const body = `
  <h1>${esc(T(lang, 'exH1', { n: ex.name }))}</h1>
  <p class="intro">${esc(T(lang, 'exIntro', { n: ex.name, u: UPD }))}</p>
  <div class="tbadges">${badges}</div>

  <h3>${esc(T(lang, 'exFeeBlock'))}</h3>
  <div class="fee-panel">
    <div class="fee-tabs"><button type="button" class="ftab active" data-mkt="spot">${zh ? '现货' : 'Spot'}</button><button type="button" class="ftab" data-mkt="fut">${zh ? '合约' : 'Futures'}</button></div>
    <div class="fee-tier"><label>${esc(T(lang, 'exTier'))}</label><select id="feeTier">${tierOpts}</select></div>
    <div class="fee-rates">
      <div class="frate"><span>${esc(T(lang, 'exMaker'))}</span><b id="feeMaker"></b></div>
      <div class="frate"><span>${esc(T(lang, 'exTaker'))}</span><b id="feeTaker"></b></div>
    </div>
    <div class="fee-meta"><span id="feeTh"></span>${discHtml}</div>
  </div>

  <h3>${esc(T(lang, 'exSecBlock'))}</h3>
  <div class="sec-list">
    <div class="srow"><span>${esc(T(lang, 'exReserve'))}</span><b>${esc(cd.reserve || '—')}</b></div>
    <div class="srow"><span>${esc(T(lang, 'exCold'))}</span><b>${esc(cd.cold || '—')}</b></div>
    <div class="srow"><span>${esc(T(lang, 'exLicenses'))}</span><b>${esc(cd.licenses || '—')}</b></div>
    <div class="srow"><span>${esc(T(lang, 'exKyc'))}</span><b>${esc(cd.kyc || '—')}</b></div>
    <div class="srow"><span>${esc(T(lang, 'exIncident'))}</span><b>${esc(cd.incident || '—')}</b></div>
  </div>

  <h3>${esc(T(lang, 'exWdBlock'))}</h3>
  <div class="scroll"><table><thead><tr><th>${esc(T(lang, 'exNet'))}</th><th>${esc(T(lang, 'exFee'))}</th></tr></thead><tbody>${wdRows}</tbody></table></div>

  <h3>${esc(T(lang, 'exDepBlock'))}</h3>
  <div class="scroll"><table><thead><tr><th>${esc(T(lang, 'exMethod'))}</th><th>${esc(T(lang, 'exFee'))}</th></tr></thead><tbody>${depRows}</tbody></table></div>

  <h3>${esc(T(lang, 'exCapBlock'))}</h3>
  <div class="cap-grid">${caps}</div>

  ${linkFor(slug) ? `<p style="margin-top:18px">${ctaHtml(slug, esc(T(lang, 'ctaAcct', { x: ex.name })), lang)}</p>` : ''}
  <p class="note" style="margin-top:16px">${esc(T(lang, 'exNote'))}</p>
  <p class="intro" style="margin-top:12px">${esc(T(lang, 'exCompare'))}${cmpLinks}</p>
  <script>
  (function(){
    var tiers = ${JSON.stringify(tiers)};
    var mkt = 'spot';
    var sel = document.getElementById('feeTier');
    var tabs = document.querySelectorAll('.ftab');
    function fmt(x){ return x == null ? '\u2014' : (x*100).toFixed(3).replace(/\\.?0+$/, '') + '%'; }
    function render(){
      var t = tiers[sel.selectedIndex] || tiers[0];
      var maker = mkt === 'spot' ? t.sm : t.fm;
      var taker = mkt === 'spot' ? t.st : t.ft;
      document.getElementById('feeMaker').textContent = fmt(maker);
      document.getElementById('feeTaker').textContent = fmt(taker);
      document.getElementById('feeTh').textContent = ${JSON.stringify(zh ? '30天量 ' : '30d volume ')} + t.th;
    }
    for (var i=0;i<tabs.length;i++){ tabs[i].addEventListener('click', function(e){
      for (var j=0;j<tabs.length;j++) tabs[j].classList.remove('active');
      this.classList.add('active');
      mkt = this.getAttribute('data-mkt');
      render();
    });}
    sel.addEventListener('change', render);
    render();
  })();
  </script>`;
  return page({ lang, title: T(lang, 'exTitle', { n: ex.name }), desc: T(lang, 'exDesc', { n: ex.name }), body, path: `${lang === 'zh' ? 'zh/' : ''}exchanges/${slug}.html`, affiliate: false });
}

function comparePage(slugA, slugB, lang) {
  const a = EX[slugA], b = EX[slugB];
  const rows = [
    [T(lang, 'fSpotTaker'), pct(a.spot.taker), pct(b.spot.taker)],
    [T(lang, 'fSpotMaker'), pct(a.spot.maker), pct(b.spot.maker)],
    [T(lang, 'fFutTaker'), pct(a.futures.taker), pct(b.futures.taker)],
    [T(lang, 'fWd20'), usd(getFee(slugA, 'TRC20')), usd(getFee(slugB, 'TRC20'))],
    [T(lang, 'fWdErc'), usd(getFee(slugA, 'ERC20')), usd(getFee(slugB, 'ERC20'))],
    [T(lang, 'fBot'), a.has_trading_bot ? '✓' : '✗', b.has_trading_bot ? '✓' : '✗'],
    [T(lang, 'fApi'), a.has_api ? '✓' : '✗', b.has_api ? '✓' : '✗']
  ].map((r) => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
  const body = `
  <h1>${esc(T(lang, 'cpH1', { a: a.name, b: b.name }))}</h1>
  <p class="intro">${esc(T(lang, 'cpIntro', { u: UPD }))}</p>
  <div class="scroll"><table><thead><tr><th>${esc(T(lang, 'cpTh'))}</th><th>${a.name}</th><th>${b.name}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">${ctaHtml(slugA, esc(T(lang, 'ctaOpenOn', { x: a.name })), lang)}${ctaHtml(slugB, esc(T(lang, 'ctaOpenOn', { x: b.name })), lang)}</p>`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: T(lang, 'cpQ1', { a: a.name, b: b.name }), answer: { '@type': 'Answer', text: T(lang, 'cpA1', { a: a.name, b: b.name, k: pct(a.spot.taker), o: pct(b.spot.taker), u: UPD }) } }]
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
  return page({ lang, title: T(lang, 'cyTitle', { n: name }), desc: T(lang, 'cyDesc', { n: name }), body, depth: lang === 'zh' ? 2 : 1, path: `${lang === 'zh' ? 'zh/' : ''}${cc.toLowerCase()}/exchanges.html`, affiliate: false, noDisc: true });
}

function indexPage(lang) {
  const p = (rel) => absPath(lang, rel);
  // 搜索框：symbol 集合（校验）+ datalist（补全）
  const symSet = {};
  COIN_LIST.forEach((c) => { symSet[c.symbol] = 1; });
  const coinOptions = COIN_LIST.map((c) => `<option value="${esc(c.symbol)}">${esc(c.symbol)} — ${esc(c.name)}</option>`).join('');
  const searchPh = lang === 'zh' ? '搜索币种，如 BTC、ETH、SOL' : 'Search a coin, e.g. BTC, ETH, SOL';
  const searchBtn = lang === 'zh' ? '搜索' : 'Search';
  const searchNf = lang === 'zh' ? '未找到该币种，请检查币种代号' : 'Coin not found — check the ticker';
  const body = `
  <h1>${esc(T(lang, 'idxH1'))}</h1>
  <p class="intro">${esc(T(lang, 'idxIntro'))}</p>
  <div style="display:flex;gap:8px;margin:0 0 18px">
    <input id="idxCoinInput" type="text" list="idxCoinList" placeholder="${searchPh}" autocomplete="off" style="flex:1;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:15px;background:#fff;text-transform:uppercase;font-family:ui-monospace,Menlo,Consolas,monospace">
    <button id="idxSearchBtn" type="button" style="background:var(--brand);color:#fff;border:none;padding:0 22px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap">${searchBtn}</button>
  </div>
  <datalist id="idxCoinList">${coinOptions}</datalist>
  <div class="grid">
    <div class="card"><a class="card-title" href="${p(tcPath(lang))}"><span class="ic">${ICON.receipt}</span><b>${esc(T(lang, 'idxTcT'))}</b></a><br>${esc(T(lang, 'idxTcB'))}<br><a href="${p(tcPath(lang))}">${esc(T(lang, 'idxTcC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(futPath(lang))}"><span class="ic">${ICON.trend}</span><b>${esc(T(lang, 'idxFutT'))}</b></a><br>${esc(T(lang, 'idxFutB'))}<br><a href="${p(futPath(lang))}">${esc(T(lang, 'idxFutC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(cmpPath(lang))}"><span class="ic">${ICON.scale}</span><b>${esc(T(lang, 'idxCmpT'))}</b></a><br>${esc(T(lang, 'idxCmpB'))}<br><a href="${p(cmpPath(lang))}">${esc(T(lang, 'idxCmpC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(secPath(lang))}"><span class="ic">${ICON.shield}</span><b>${esc(T(lang, 'idxSecT'))}</b></a><br>${esc(T(lang, 'idxSecB'))}<br><a href="${p(secPath(lang))}">${esc(T(lang, 'idxSecC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(pfPath(lang))}"><span class="ic">${ICON.wallet}</span><b>${esc(T(lang, 'idxPfT'))}</b></a><br>${esc(T(lang, 'idxPfB'))}<br><a href="${p(pfPath(lang))}">${esc(T(lang, 'idxPfC'))}</a></div>
    <div class="card"><a class="card-title" href="${p(gloPath(lang))}"><span class="ic">${ICON.coins}</span><b>${esc(T(lang, 'idxGloT'))}</b></a><br>${esc(T(lang, 'idxGloB'))}<br><a href="${p(gloPath(lang))}">${esc(T(lang, 'idxGloC'))}</a></div>
  </div>
  <script>
  (function(){
    var SYMS = ${JSON.stringify(symSet)};
    var PREFIX = ${JSON.stringify(p('where-to-buy/'))};
    var NF = ${JSON.stringify(searchNf)};
    function go(){
      var v = (document.getElementById('idxCoinInput').value||'').trim().toUpperCase();
      if(!v) return;
      if(SYMS[v]) { location.href = PREFIX + v.toLowerCase() + '.html'; }
      else { alert(NF); }
    }
    document.getElementById('idxSearchBtn').addEventListener('click', go);
    document.getElementById('idxCoinInput').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
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
    if (CA[cc].restricted) continue;
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
const pages = urls.filter((u) => u.endsWith('.html'));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((u) => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// Cloudflare Pages _headers：缓存策略
// - HTML/XML 不缓存（根治边缘/浏览器缓存旧版导致的陈旧内容；数据是快照，需保证新鲜）
// - assets/ 静态资源（logo/favicon 几乎不变）长缓存，享受 CDN 加速
// 语法：路径匹配（* 通配任意字符含 /），子行缩进 2 空格写响应头
write('_headers', [
  '/*.html',
  '  Cache-Control: no-cache, no-store, must-revalidate',
  '',
  '/*.xml',
  '  Cache-Control: no-cache, no-store, must-revalidate',
  '',
  '/assets/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
  '/data/*',
  '  Cache-Control: public, max-age=300',
  '',
  '/',
  '  Cache-Control: no-cache, no-store, must-revalidate',
  '',
  '/zh/',
  '  Cache-Control: no-cache, no-store, must-revalidate',
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
