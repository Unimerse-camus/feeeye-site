/*
 * exchanges.js — 交易所费率与能力数据层（P1 数据底座）
 * =========================================================
 * 2026-08-13 全面重核（用户实锤 + cexorer 实时监控 + 官方费率页 + 多源交叉）：
 *   - 现货/合约费率沿用 08-12 核实值（官方基础档）
 *   - USDT 提现费按网络逐条核实（TRC20 固定费 + ERC20 动态费标 approx；ERC20 随 gas 波动，页面已加"动态"标注）
 *   - 入金费从「3 类粗糙模型」升级为「真实通道列表 deposit_methods」（银行/卡/Apple Pay/Bpay/P2P 等各自费率）
 * 数据时效性说明：
 *   - ERC20 提现费为**动态**（随 ETH gas 波动），标注 approx 并建议页面提示「以交易所实时为准」
 *   - 入金通道费率因地区/支付服务商浮动，note 字段标注区间
 * 监管动态：KuCoin 2026-02 奥地利 FMA 暂停欧盟新客户 onboarding；2026-03 CFTC 美国永久禁令。
 * 字段命名统一，供 /tools 计算器与 /exchanges/[x] 程序化页面共用。
 */

window.EXCHANGES = {
  "kucoin": {
    "slug": "kucoin",
    "name": "KuCoin",
    "official_url": "https://www.kucoin.com",
    "affiliate_link": "https://www.kucoin.com/r/af/HODL100",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0006 },
    "usdt_withdrawal": { "TRC20": 1.5, "ERC20": 12.0, "BSC": 1.0, "SOL": 1.5, "Arbitrum": 1.0, "Base": 0.6, "Optimism": 1.0, "Polygon": 0.8, "TON": 0.5, "NEAR": 0.5, "PLASMA": 0.4 },
    "withdrawal_note": "TRC20=1.5; ERC20 动态 ~12 (gas 波动); 最便宜 PLASMA 0.4",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "fee_max": 0.015, "note": "0-1.5% via partners" },
      { "m": "Credit/Debit card", "fee": 0.025, "fee_max": 0.035, "note": "2.5-3.5%" },
      { "m": "P2P", "fee": 0, "premium": 0.008, "note": "0% fee + ~0.8% price premium" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon", "TON", "NEAR"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "KuCoin base spot 0.10% (20% off with KCS). USDT-TRC20 withdraw 1.5 USDT. EU onboarding paused (Feb 2026); US banned (Mar 2026).",
    "source": "https://www.kucoin.com/vip/level + cexorer.com/kucoin/usdt",
    "last_updated": "2026-08-13"
  },
  "binance": {
    "slug": "binance",
    "name": "Binance",
    "official_url": "https://www.binance.com",
    "affiliate_link": "https://www.binance.com/register?ref=BTCANDSOL",
    "affiliate_rate": { "spot": 0.20, "futures": 0.10 },
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 4.0, "BSC": 0.3, "SOL": 0.01, "Arbitrum": 0.1, "Base": 0.5, "Optimism": 0.1, "Polygon": 0.1 },
    "withdrawal_note": "TRC20=1; ERC20 动态 ~4 (gas 波动); BSC 0.3",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "ACH/SEPA free; SWIFT bank fee" },
      { "m": "Credit/Debit card", "fee": 0.018, "fee_max": 0.035, "note": "1.8-3.5% via third-party" },
      { "m": "Apple Pay", "fee": 0.036, "note": "2026-08 user-verified 3.6%" },
      { "m": "Google Pay", "fee": 0.036, "fee_max": 0.041, "note": "3.6-4.1% (2026-08 user-verified via Bpay)" },
      { "m": "Bpay", "fee": 0, "note": "AU bank payment, 0 fee" },
      { "m": "P2P", "fee": 0, "premium": 0.005, "note": "0% fee + ~0.3-0.8% premium" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Binance base spot 0.10% (25% off with BNB). USDT-TRC20 1 USDT. Fiat deposit methods vary by region.",
    "source": "https://www.binance.com/en/fee/schedule",
    "last_updated": "2026-08-13"
  },
  "bybit": {
    "slug": "bybit",
    "name": "Bybit",
    "official_url": "https://www.bybit.com",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.00055 },
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 4.0, "BSC": 0.8, "SOL": 0.01, "Arbitrum": 0.1, "Base": 0.1, "Optimism": 0.1 },
    "withdrawal_note": "TRC20=1; ERC20 动态 ~4 (gas 波动)",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "SEPA free; local varies" },
      { "m": "Credit/Debit card", "fee": 0.015, "fee_max": 0.035, "note": "1.5-3.5% via Simplex/Banxa" },
      { "m": "Apple Pay", "fee": 0.015, "fee_max": 0.035, "note": "card channel, 1.5-3.5%" },
      { "m": "Google Pay", "fee": 0.015, "fee_max": 0.035, "note": "card channel, 1.5-3.5%" },
      { "m": "P2P", "fee": 0, "premium": 0.008, "note": "0% fee + spread in price" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bybit base spot 0.10%. USDT-TRC20 1 USDT. Restricted: US/China/Singapore/etc.",
    "source": "https://www.bybit.com/en/help-center/fee",
    "last_updated": "2026-08-13"
  },
  "okx": {
    "slug": "okx",
    "name": "OKX",
    "official_url": "https://www.okx.com",
    "affiliate_link": "https://www.okx.com/account/register?channelid=1897959",
    "spot":      { "maker": 0.0008, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 5.0, "BSC": 0.5, "SOL": 0.05, "Arbitrum": 0.1, "Base": 0.1, "Optimism": 0.1, "Polygon": 0.2 },
    "withdrawal_note": "TRC20=1; ERC20 动态 ~5 (gas 波动)",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "SEPA free; varies by region" },
      { "m": "Credit/Debit card", "fee": 0.02, "fee_max": 0.03, "note": "2-3% via 3rd-party" },
      { "m": "Apple Pay", "fee": 0.02, "fee_max": 0.03, "note": "card channel, 2-3%" },
      { "m": "P2P", "fee": 0, "premium": 0.008, "note": "0% fee + premium" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "OKX spot 0.08%/0.10% (Lv1). USDT-TRC20 1 USDT. Mainland-China KYC status changing (2026).",
    "source": "https://www.okx.com/fees",
    "last_updated": "2026-08-13"
  },
  "bitget": {
    "slug": "bitget",
    "name": "Bitget",
    "official_url": "https://www.bitget.com",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0006 },
    "usdt_withdrawal": { "TRC20": 1.5, "ERC20": 1.6, "BSC": 0.15, "SOL": 1.0, "Arbitrum": 0.15, "Base": 0.15, "Optimism": 0.15 },
    "withdrawal_note": "TRC20=1.5; ERC20 动态 ~1.6 (gas 波动); BSC 0.15",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "SEPA free" },
      { "m": "Credit/Debit card", "fee": 0.02, "fee_max": 0.035, "note": "2-3.5% (processor-dependent)" },
      { "m": "PayPal", "fee": 0.03, "fee_max": 0.05, "note": "3-5%" },
      { "m": "P2P", "fee": 0, "premium": 0.008, "note": "0% fee + premium" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bitget base spot 0.10% (20% off with BGB). USDT-TRC20 1.5 USDT.",
    "source": "https://www.bitget.com/fee",
    "last_updated": "2026-08-13"
  },
  "kraken": {
    "slug": "kraken",
    "name": "Kraken",
    "official_url": "https://www.kraken.com",
    "spot":      { "maker": 0.0025, "taker": 0.0040 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "usdt_withdrawal": { "TRC20": 2.0, "ERC20": 2.5, "BSC": 0.8, "SOL": 0.01, "Arbitrum": 0.25, "Polygon": 0.8 },
    "withdrawal_note": "TRC20 ~2; ERC20 动态 ~2.5 (gas 波动)",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "ACH/SEPA/FPS free" },
      { "m": "Wire transfer", "fee": 0.005, "note": "$5-10 per transfer" },
      { "m": "Credit/Debit card", "fee": 0.03, "fee_max": 0.04, "note": "3-4% via 3rd-party" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Polygon"],
    "has_trading_bot": false,
    "has_api": true,
    "has_copy_trading": false,
    "new_user_note": "Kraken Pro spot 0.25%/0.40%. USDT-TRC20 ~2 USDT (ERC20 ~2.5). No P2P.",
    "source": "https://www.kraken.com/features/fee-schedule",
    "last_updated": "2026-08-13"
  },
  "coinbase": {
    "slug": "coinbase",
    "name": "Coinbase",
    "official_url": "https://www.coinbase.com",
    "spot":      { "maker": 0.0040, "taker": 0.0060 },
    "futures":   { "maker": 0.0000, "taker": 0.0003 },
    "usdt_withdrawal": { "ERC20": 3.0, "BSC": 0.5, "Base": 0.2, "Arbitrum": 0.2 },
    "withdrawal_note": "No TRC20 USDT; ERC20/Base/BSC/Arbitrum. USDC→USD 1:1 free",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "ACH free" },
      { "m": "Wire transfer", "fee": 0.01, "note": "$10-25 outbound" },
      { "m": "Credit/Debit card", "fee": 0.0399, "note": "3.99%" }
    ],
    "supported_networks": ["ERC20", "BSC", "Base", "Arbitrum", "Polygon"],
    "has_trading_bot": false,
    "has_api": true,
    "has_copy_trading": false,
    "new_user_note": "Coinbase Advanced spot 0.40%/0.60%. No TRC20 USDT (ERC20/Base/BSC/Arbitrum). No P2P.",
    "source": "https://www.coinbase.com/fees",
    "last_updated": "2026-08-13"
  }
};

// 辅助：返回某所某网络的 USDT 提币费；不支持返回 null
window.getUsdtWithdrawalFee = function (slug, network) {
  const ex = window.EXCHANGES[slug];
  if (!ex) return null;
  return ex.usdt_withdrawal[network] != null ? ex.usdt_withdrawal[network] : null;
};
// 辅助：返回某所全部入金通道名（供计算器下拉合并）
window.getAllDepositMethods = function () {
  const set = new Set();
  Object.keys(window.EXCHANGES).forEach((s) => {
    (window.EXCHANGES[s].deposit_methods || []).forEach((d) => set.add(d.m));
  });
  return [...set];
};

// ---- T2 智能交易所对比器 · 非费率维度数据（2026-08-14 二次全量核实）----
// 费率/提币/入金 从 EXCHANGES 读；币种数/流动性/信任/安全/KYC/牌照/储备率/冷存储 在此
// 口径说明（务必保持一致）：
//   coins（币种数）  = CoinGecko /exchanges/{id} 的 coins 字段（有活跃现货市场的币种数，统一口径可横向对比）
//   volume（24h量）  = CoinGecko trade_volume_24h_btc × BTC 价换算 USD（快照值）
//   trust（信任分）  = CoinGecko trust_score（10 分制）
//   reserve（储备证明）/ cold（冷存储）= 各所官方 PoR/安全页声称值；Binance 冷存储官方未公开精确比例 → 标 "~95% (est.)"
//   security（安全）= 编辑综合（历史事件 + 储备/冷存储），非官方评级
window.EXCHANGE_COMPARE = {
  "kucoin": {
    "max_leverage": 100, "has_options": true, "has_leveraged_tokens": true, "has_margin": true, "coins": 848, "volume": "≈$0.65B", "trust": 9, "security": 8,
    "kyc": "Mandatory", "licenses": "Seychelles + AU + EU (Estonia) + Bermuda",
    "reserve": "100%+ (PoR)", "cold": "95%+", "incident": "2020 $281M hack (fully compensated)"
  },
  "binance": {
    "max_leverage": 125, "has_options": true, "has_leveraged_tokens": true, "has_margin": true, "coins": 486, "volume": "≈$5.5B", "trust": 10, "security": 9,
    "kyc": "Mandatory", "licenses": "ADGM Abu Dhabi + VARA Dubai + multiple (no EU MiCA)",
    "reserve": "~101% (PoR)", "cold": "~95% (est.)", "incident": "2019 $40M hack (compensated); 2023 US DOJ AML settlement"
  },
  "bybit": {
    "max_leverage": 100, "has_options": true, "has_leveraged_tokens": false, "has_margin": true, "coins": 411, "volume": "≈$1.1B", "trust": 9, "security": 7,
    "kyc": "Mandatory", "licenses": "VARA Dubai + EU (MiCA)",
    "reserve": ">100% (Hacken)", "cold": "95%", "incident": "2025 Feb $1.46B hack (fully compensated)"
  },
  "okx": {
    "max_leverage": 100, "has_options": true, "has_leveraged_tokens": true, "has_margin": true, "coins": 306, "volume": "≈$1.15B", "trust": 10, "security": 9,
    "kyc": "Mandatory", "licenses": "Malta (EU MiCA) + VARA Dubai + Singapore MAS + HK SFC",
    "reserve": "105% / 112%", "cold": "95%+", "incident": "No hack; 2025 US DOJ settlement (AML)"
  },
  "bitget": {
    "max_leverage": 125, "has_options": true, "has_leveraged_tokens": true, "has_margin": true, "coins": 538, "volume": "≈$0.44B", "trust": 10, "security": 8,
    "kyc": "Tiered (≤$10K no-KYC)", "licenses": "Seychelles + Lithuania + Australia",
    "reserve": "123–163%", "cold": "95%", "incident": "No external hack"
  },
  "kraken": {
    "max_leverage": 50, "has_options": false, "has_leveraged_tokens": false, "has_margin": true, "coins": 735, "volume": "≈$0.7B", "trust": 10, "security": 10,
    "kyc": "Strict (US-licensed)", "licenses": "US + EU (MiCA) + UK + Canada",
    "reserve": "~101% (PoR)", "cold": "95%", "incident": "No major hack"
  },
  "coinbase": {
    "max_leverage": 10, "has_options": false, "has_leveraged_tokens": false, "has_margin": true, "coins": 404, "volume": "≈$0.80B", "trust": 10, "security": 9,
    "kyc": "Strict (US-listed)", "licenses": "US (NYSE) + EU + UK",
    "reserve": "Public audits (no PoR)", "cold": "98%+", "incident": "No hack; 2024 customer data breach"
  }
};
