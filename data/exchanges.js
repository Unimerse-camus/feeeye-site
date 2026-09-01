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
    "withdrawal_fees": { "TRC20": {"amount":1.5,"model":"fixed_snapshot"}, "ERC20": {"amount":12.0,"model":"dynamic_snapshot"}, "BSC": {"amount":1.0,"model":"fixed_snapshot"}, "SOL": {"amount":1.5,"model":"fixed_snapshot"}, "Arbitrum": {"amount":1.0,"model":"fixed_snapshot"}, "Base": {"amount":0.6,"model":"fixed_snapshot"}, "Optimism": {"amount":1.0,"model":"fixed_snapshot"}, "Polygon": {"amount":0.8,"model":"fixed_snapshot"}, "TON": {"amount":0.5,"model":"fixed_snapshot"}, "NEAR": {"amount":0.5,"model":"fixed_snapshot"}, "PLASMA": {"amount":0.4,"model":"fixed_snapshot"} },
    "withdrawal_note": "TRC20=1.5; ERC20 动态 ~12 (gas 波动); 最便宜 PLASMA 0.4",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "fee_max": 0.015, "note": "0-1.5% via partners" },
      { "m": "Credit/Debit card", "fee": 0.025, "fee_max": 0.035, "note": "2.5-3.5%" },
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon", "TON", "NEAR", "PLASMA"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "KuCoin base spot 0.10% (20% off with KCS). USDT-TRC20 withdraw 1.5 USDT. EU onboarding paused (Feb 2026); US banned (Mar 2026).",
    "source": "https://www.kucoin.com/vip/level + cexorer.com/kucoin/usdt",
    "last_updated": "2026-08-27",
    "evidence": {
      "trading_fees": {"url":"https://www.kucoin.com/vip/level","checked_at":"2026-08-27"},
      "withdrawal_fees": {"url":"https://www.kucoin.com/assets/withdraw/USDT","checked_at":"2026-08-20","access":"live_quote"},
      "kyc": {"url":"https://www.kucoin.com/support/360015102254","checked_at":"2026-08-20"},
      "regulation": {"url":"https://www.kucoin.com/legal/licenses","checked_at":"2026-08-20"},
      "reserves": {"url":"https://www.kucoin.com/proof-of-reserves","checked_at":"2026-08-20"}
    },
    "slogan": {"en": "People's Exchange", "zh": "人民的交易所"},
    "token_discount": {"token": "KCS", "spot": 0.2, "futures": null, "note": {"en": "Pay fees with KCS: 20% off eligible spot and margin trades", "zh": "使用 KCS 支付手续费：符合条件的现货及杠杆现货交易享 20% 优惠"}, "source": "https://www.kucoin.com/support/30380295503769"},
    "vip_tiers": [{"t": "LV 0", "th": "< $50K", "sm": 0.001, "st": 0.001, "fm": 0.0002, "ft": 0.0006}, {"t": "LV 1", "th": "≥ $50K", "sm": 0.0009, "st": 0.001, "fm": 0.00018, "ft": 0.00055}, {"t": "LV 2", "th": "≥ $100K", "sm": 0.0008, "st": 0.001, "fm": 0.00016, "ft": 0.0005}, {"t": "LV 3", "th": "≥ $500K", "sm": 0.0007, "st": 0.0009, "fm": 0.00014, "ft": 0.00045}, {"t": "LV 4", "th": "≥ $1M", "sm": 0.0006, "st": 0.0008, "fm": 0.00012, "ft": 0.0004}, {"t": "LV 5", "th": "≥ $3M", "sm": 0.0005, "st": 0.0007, "fm": 0.0001, "ft": 0.00036}, {"t": "LV 6", "th": "≥ $5M", "sm": 0.0004, "st": 0.0006, "fm": 8e-05, "ft": 0.00032}, {"t": "LV 7", "th": "≥ $10M", "sm": 0.0003, "st": 0.0005, "fm": 6e-05, "ft": 0.00028}, {"t": "LV 8", "th": "≥ $20M", "sm": 0.0002, "st": 0.0004, "fm": 4e-05, "ft": 0.00025}, {"t": "LV 9", "th": "≥ $50M", "sm": 0.0001, "st": 0.0003, "fm": 2e-05, "ft": 0.00022}, {"t": "LV 10", "th": "≥ $100M", "sm": 5e-05, "st": 0.0002, "fm": 0.0, "ft": 0.0002}, {"t": "LV 11", "th": "≥ $500M", "sm": 0.0, "st": 0.00015, "fm": -2e-05, "ft": 0.00018}, {"t": "LV 12", "th": "≥ $1B", "sm": -5e-05, "st": 0.0001, "fm": -4e-05, "ft": 0.00016}],
  },
  "binance": {
    "slug": "binance",
    "name": "Binance",
    "official_url": "https://www.binance.com",
    "affiliate_link": "https://www.binance.com/register?ref=BTCANDSOL",
    "affiliate_rate": { "spot": 0.20, "futures": 0.10 },
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "withdrawal_fees": { "TRC20": {"amount":1.0,"model":"fixed_snapshot"}, "ERC20": {"amount":4.0,"model":"dynamic_snapshot"}, "BSC": {"amount":0.3,"model":"fixed_snapshot"}, "SOL": {"amount":0.01,"model":"fixed_snapshot"}, "Arbitrum": {"amount":0.1,"model":"fixed_snapshot"}, "Base": {"amount":0.5,"model":"fixed_snapshot"}, "Optimism": {"amount":0.1,"model":"fixed_snapshot"}, "Polygon": {"amount":0.1,"model":"fixed_snapshot"} },
    "withdrawal_note": "TRC20=1; ERC20 动态 ~4 (gas 波动); BSC 0.3",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "ACH/SEPA free; SWIFT bank fee" },
      { "m": "Credit/Debit card", "fee": 0.018, "fee_max": 0.035, "note": "1.8-3.5% via third-party" },
      { "m": "Apple Pay", "fee": 0.036, "note": "2026-08 user-verified 3.6%" },
      { "m": "Google Pay", "fee": 0.036, "fee_max": 0.041, "note": "3.6-4.1% (2026-08 user-verified via Bpay)" },
      { "m": "Bpay", "fee": 0, "note": "AU bank payment, 0 fee" },
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Binance base spot 0.10% (25% off with BNB). USDT-TRC20 1 USDT. Fiat deposit methods vary by region.",
    "source": "https://www.binance.com/en/fee/schedule",
    "last_updated": "2026-08-27",
    "evidence": {
      "trading_fees": {"url":"https://www.binance.com/en/fee/trading","checked_at":"2026-08-27"},
      "withdrawal_fees": {"url":"https://www.binance.com/en/fee/cryptoFee","checked_at":"2026-08-20","access":"live_quote"},
      "kyc": {"url":"https://www.binance.com/en/support/faq/what-is-identity-verification-and-how-to-complete-it-360027287111","checked_at":"2026-08-20"},
      "regulation": {"url":"https://www.binance.com/en/legal/licenses","checked_at":"2026-08-20"},
      "reserves": {"url":"https://www.binance.com/en/proof-of-reserves","checked_at":"2026-08-20"}
    },
    "trust_badges": [
      {"type": "award",  "en": "Forbes 2025 Most Trusted Crypto Exchange",       "zh": "福布斯 2025 最受信赖加密交易所"},
      {"type": "award",  "en": "CNBC 2025 World Top Fintech",                   "zh": "CNBC 2025 全球顶级金融科技"},
      {"type": "award",  "en": "Fortune Crypto 40 — CeFi Leader",              "zh": "财富 Crypto 40——CeFi 领域领导者"},
      {"type": "volume", "en": "Daily trading volume: ~$65B",                  "zh": "日交易量约 650 亿美元"},
      {"type": "fund",   "en": "SAFU — Secure Asset Fund for Users ($1B)",     "zh": "SAFU 用户保护基金（10 亿美元）"},
      {"type": "support","en": "24/7 customer support · 40+ languages",        "zh": "7×24 客户支持 · 40+ 种语言"}
    ],
    "slogan": {"en": "The world's leading crypto exchange", "zh": "全球领先的加密货币交易所"},
    "token_discount": {"token": "BNB", "spot": 0.25, "futures": 0.1, "note": {"en": "Pay fees with BNB: Spot 25% off, USDⓈ-M Futures 10% off", "zh": "使用 BNB 支付手续费：现货优惠 25%，U 本位合约优惠 10%"}, "source": "https://www.binance.com/en/fee/trading"},
    "vip_tiers": [{"t": "Regular", "th_spot": "< $1M", "th_futures": "< $5M", "sm": 0.001, "st": 0.001, "fm": 0.0002, "ft": 0.0005}, {"t": "VIP 1", "th_spot": "≥ $1M", "th_futures": "≥ $5M", "sm": 0.0009, "st": 0.001, "fm": 0.00016, "ft": 0.0004}, {"t": "VIP 2", "th_spot": "≥ $5M", "th_futures": "≥ $10M", "sm": 0.0008, "st": 0.001, "fm": 0.00014, "ft": 0.00035}, {"t": "VIP 3", "th_spot": "≥ $20M", "th_futures": "≥ $50M", "sm": 0.0004, "st": 0.0006, "fm": 0.00012, "ft": 0.00032}, {"t": "VIP 4", "th_spot": "≥ $75M", "th_futures": "≥ $600M", "sm": 0.0004, "st": 0.00052, "fm": 0.0001, "ft": 0.0003}, {"t": "VIP 5", "th_spot": "≥ $150M", "th_futures": "≥ $1B", "sm": 0.00025, "st": 0.00031, "fm": 6e-05, "ft": 0.00027}, {"t": "VIP 6", "th_spot": "≥ $400M", "th_futures": "≥ $2.5B", "sm": 0.0002, "st": 0.00029, "fm": 5e-05, "ft": 0.00025}, {"t": "VIP 7", "th_spot": "≥ $800M", "th_futures": "≥ $5B", "sm": 0.00019, "st": 0.00028, "fm": 4e-05, "ft": 0.00023}, {"t": "VIP 8", "th_spot": "≥ $2B", "th_futures": "≥ $12B", "sm": 0.00016, "st": 0.00025, "fm": 3e-05, "ft": 0.00021}, {"t": "VIP 9", "th_spot": "≥ $4B", "th_futures": "≥ $25B", "sm": 0.00011, "st": 0.00023, "fm": 0.0, "ft": 0.00017}]
  },
  "bybit": {
    "slug": "bybit",
    "name": "Bybit",
    "official_url": "https://www.bybit.com",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.00055 },
    "withdrawal_fees": { "TRC20": {"amount":1.0,"model":"fixed_snapshot"}, "ERC20": {"amount":4.0,"model":"dynamic_snapshot"}, "BSC": {"amount":0.8,"model":"fixed_snapshot"}, "SOL": {"amount":0.01,"model":"fixed_snapshot"}, "Arbitrum": {"amount":0.1,"model":"fixed_snapshot"}, "Base": {"amount":0.1,"model":"fixed_snapshot"}, "Optimism": {"amount":0.1,"model":"fixed_snapshot"} },
    "withdrawal_note": "TRC20=1; ERC20 动态 ~4 (gas 波动)",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "SEPA free; local varies" },
      { "m": "Credit/Debit card", "fee": 0.015, "fee_max": 0.035, "note": "1.5-3.5% via Simplex/Banxa" },
      { "m": "Apple Pay", "fee": 0.015, "fee_max": 0.035, "note": "card channel, 1.5-3.5%" },
      { "m": "Google Pay", "fee": 0.015, "fee_max": 0.035, "note": "card channel, 1.5-3.5%" },
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bybit base spot 0.10%. USDT-TRC20 1 USDT. Restricted: US/China/Singapore/etc.",
    "source": "https://www.bybit.com/en/help-center/fee",
    "last_updated": "2026-08-27",
    "evidence": {
      "trading_fees": {"url":"https://www.bybit.com/en/help-center/article/Trading-Fee-Structure","checked_at":"2026-08-27"},
      "withdrawal_fees": {"url":"https://www.bybit.com/en-GB/help-center/article/Bybit-Fees-You-Need-to-Know","checked_at":"2026-08-20","access":"live_quote"},
      "kyc": {"url":"https://www.bybit.com/en/help-center/article/Individual-KYC-FAQ","checked_at":"2026-08-20"},
      "regulation": {"url":"https://www.bybit.com/en/help-center/article/Bybit-s-Regulatory-Licenses","checked_at":"2026-08-20"},
      "reserves": {"url":"https://www.bybit.com/app/user/proof-of-reserve","checked_at":"2026-08-20"}
    },
    "slogan": {"en": "Trade with confidence", "zh": "自信交易，掌控市场"},
    "token_discount": {"token": "MNT", "spot": 0.25, "futures": 0.1, "note": {"en": "Pay fees with MNT: Spot 25% off, eligible Futures 10% off", "zh": "使用 MNT 支付手续费：现货优惠 25%，符合条件的合约优惠 10%"}, "source": "https://www.bybit.com/en/help-center/article/FAQ-Paying-Trading-Fees-with-MNT"},
    "vip_tiers": [{"t": "VIP 0", "th": "< $100K", "sm": 0.001, "st": 0.001, "fm": 0.0002, "ft": 0.00055}, {"t": "VIP 1", "th": "≥ $1M", "sm": 0.0006, "st": 0.0008, "fm": 0.00015, "ft": 0.0004}, {"t": "VIP 2", "th": "≥ $5M", "sm": 0.0004, "st": 0.0006, "fm": 0.0001, "ft": 0.00032}, {"t": "VIP 3", "th": "≥ $10M", "sm": 0.0002, "st": 0.0004, "fm": 5e-05, "ft": 0.00022}, {"t": "Pro 4", "th": "≥ $50M", "sm": 0.0001, "st": 0.0003, "fm": 0.0, "ft": 0.00015}, {"t": "Pro 5", "th": "≥ $100M", "sm": 5e-05, "st": 0.0002, "fm": 0.0, "ft": 0.0001}],
  },
  "okx": {
    "slug": "okx",
    "name": "OKX",
    "official_url": "https://www.okx.com",
    "affiliate_link": "https://www.okx.com/account/register?channelid=1897959",
    "spot":      { "maker": 0.0008, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "withdrawal_fees": { "TRC20": {"amount":1.0,"model":"fixed_snapshot"}, "ERC20": {"amount":5.0,"model":"dynamic_snapshot"}, "BSC": {"amount":0.5,"model":"fixed_snapshot"}, "SOL": {"amount":0.05,"model":"fixed_snapshot"}, "Arbitrum": {"amount":0.1,"model":"fixed_snapshot"}, "Base": {"amount":0.1,"model":"fixed_snapshot"}, "Optimism": {"amount":0.1,"model":"fixed_snapshot"}, "Polygon": {"amount":0.2,"model":"fixed_snapshot"} },
    "withdrawal_note": "TRC20=1; ERC20 动态 ~5 (gas 波动)",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "SEPA free; varies by region" },
      { "m": "Credit/Debit card", "fee": 0.02, "fee_max": 0.03, "note": "2-3% via 3rd-party" },
      { "m": "Apple Pay", "fee": 0.02, "fee_max": 0.03, "note": "card channel, 2-3%" },
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "OKX spot 0.08%/0.10% (Lv1). USDT-TRC20 1 USDT. Mainland-China KYC status changing (2026).",
    "source": "https://www.okx.com/fees",
    "last_updated": "2026-08-27",
    "evidence": {
      "trading_fees": {"url":"https://www.okx.com/fees","checked_at":"2026-08-27"},
      "withdrawal_fees": {"url":"https://www.okx.com/balance/withdrawal","checked_at":"2026-08-20","access":"live_quote"},
      "kyc": {"url":"https://www.okx.com/en-us/help/a-beginner-guide-to-identity-verification","checked_at":"2026-08-20"},
      "regulation": {"url":"https://www.okx.com/help/terms-of-service","checked_at":"2026-08-20"},
      "reserves": {"url":"https://www.okx.com/proof-of-reserves","checked_at":"2026-08-20"}
    },
    "slogan": {"en": "Trade smarter, live better", "zh": "交易更聪明，生活更精彩"},
    "token_discount": null,
    "token_discount_status": {"en": "OKB cannot be used to offset exchange trading fees", "zh": "OKB 不能用于抵扣交易手续费", "source": "https://www.okx.com/en-us/help/how-to-reduce-trading-fee"},
    "vip_tiers": [{"t": "Regular", "th": "< $100K", "sm": 0.0008, "st": 0.001, "fm": 0.0002, "ft": 0.0005}, {"t": "VIP 1", "th": "≥ $100K", "sm": 0.0006, "st": 0.0009, "fm": 0.00018, "ft": 0.00045}, {"t": "VIP 2", "th": "≥ $500K", "sm": 0.0005, "st": 0.0008, "fm": 0.00016, "ft": 0.0004}, {"t": "VIP 3", "th": "≥ $2M", "sm": 0.0003, "st": 0.0006, "fm": 0.00014, "ft": 0.00036}, {"t": "VIP 4", "th": "≥ $5M", "sm": 0.0002, "st": 0.0005, "fm": 0.00012, "ft": 0.00032}, {"t": "VIP 5", "th": "≥ $10M", "sm": 0.0, "st": 0.0004, "fm": 0.0001, "ft": 0.00028}, {"t": "VIP 6", "th": "≥ $20M", "sm": -5e-05, "st": 0.00035, "fm": 8e-05, "ft": 0.00025}, {"t": "VIP 7", "th": "≥ $50M", "sm": -0.0001, "st": 0.0003, "fm": 6e-05, "ft": 0.00022}, {"t": "VIP 8", "th": "≥ $1B", "sm": -0.00015, "st": 0.00025, "fm": 4e-05, "ft": 0.00019}],
  },
  "bitget": {
    "slug": "bitget",
    "name": "Bitget",
    "official_url": "https://www.bitget.com",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0006 },
    "withdrawal_fees": { "TRC20": {"amount":1.5,"model":"fixed_snapshot"}, "ERC20": {"amount":1.6,"model":"dynamic_snapshot"}, "BSC": {"amount":0.15,"model":"fixed_snapshot"}, "SOL": {"amount":1.0,"model":"fixed_snapshot"}, "Arbitrum": {"amount":0.15,"model":"fixed_snapshot"}, "Base": {"amount":0.15,"model":"fixed_snapshot"}, "Optimism": {"amount":0.15,"model":"fixed_snapshot"} },
    "withdrawal_note": "TRC20=1.5; ERC20 动态 ~1.6 (gas 波动); BSC 0.15",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "SEPA free" },
      { "m": "Credit/Debit card", "fee": 0.02, "fee_max": 0.035, "note": "2-3.5% (processor-dependent)" },
      { "m": "PayPal", "fee": 0.03, "fee_max": 0.05, "note": "3-5%" },
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bitget base spot 0.10% (20% off with BGB). USDT-TRC20 1.5 USDT.",
    "source": "https://www.bitget.com/fee",
    "last_updated": "2026-08-27",
    "evidence": {
      "trading_fees": {"url":"https://www.bitget.com/en-CA/support/articles/12560603820584","checked_at":"2026-08-27"},
      "withdrawal_fees": {"url":"https://www.bitget.com/fee/withdrawal","checked_at":"2026-08-20","access":"live_quote"},
      "kyc": {"url":"https://www.bitget.com/support/articles/12560603808893","checked_at":"2026-08-20"},
      "regulation": {"url":"https://www.bitget.com/support/articles/12560603885949","checked_at":"2026-08-20"},
      "reserves": {"url":"https://www.bitget.com/proof-of-reserves","checked_at":"2026-08-20"}
    },
    "slogan": {"en": "Smarter trading, better life", "zh": "更聪明的交易，更精彩的生活"},
    "trust_badges": [{"type": "fund", "en": "Bitget Protection Fund ($300M+)", "zh": "Bitget 保护基金（3 亿美元以上）"}, {"type": "support", "en": "24/7 · multilingual", "zh": "24/7 · 多语言客服"}],
    "token_discount": {"token": "BGB", "spot": 0.2, "futures": null, "note": {"en": "Pay spot fees with BGB: 20% off eligible spot and spot-margin trades", "zh": "使用 BGB 支付现货手续费：符合条件的现货及现货杠杆交易享 20% 优惠"}, "source": "https://www.bitget.com/support/articles/360060644351"},
    "vip_tiers": [{"t": "VIP 0", "th": "< $50K", "sm": 0.001, "st": 0.001, "fm": 0.0002, "ft": 0.0006}, {"t": "VIP 1", "th": "≥ $1M", "sm": 0.0006, "st": 0.0008, "fm": 0.00014, "ft": 0.0004}, {"t": "VIP 2", "th": "≥ $5M", "sm": 0.0005, "st": 0.0007, "fm": 0.00012, "ft": 0.00035}, {"t": "VIP 3", "th": "≥ $10M", "sm": 0.0003, "st": 0.0005, "fm": 8e-05, "ft": 0.0003}, {"t": "VIP 4", "th": "≥ $20M", "sm": 0.0002, "st": 0.0004, "fm": 6e-05, "ft": 0.00025}, {"t": "VIP 5", "th": "≥ $50M", "sm": 0.0001, "st": 0.0003, "fm": 4e-05, "ft": 0.0002}, {"t": "VIP 6", "th": "≥ $100M", "sm": 5e-05, "st": 0.00025, "fm": 2e-05, "ft": 0.00017}],
  },
  "kraken": {
    "slug": "kraken",
    "name": "Kraken",
    "official_url": "https://www.kraken.com",
    "spot":      { "maker": 0.0040, "taker": 0.0080 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "withdrawal_fees": { "TRC20": {"amount":4.0,"model":"fixed_snapshot"}, "ERC20": {"amount":0.8571,"model":"dynamic_snapshot"}, "SOL": {"amount":0.9876,"model":"fixed_snapshot"}, "Arbitrum": {"amount":2.0,"model":"fixed_snapshot"}, "Optimism": {"amount":2.0,"model":"fixed_snapshot"}, "Polygon": {"amount":1.0,"model":"fixed_snapshot"} },
    "withdrawal_note": "Official Kraken snapshot: TRON 4; Ethereum 0.8571; Solana 0.9876; Arbitrum/Optimism 2; Polygon 1 USDT",
    "deposit_methods": [
      { "m": "Bank transfer", "fee": 0, "note": "ACH/SEPA/FPS free" },
      { "m": "Wire transfer", "fee": 0.005, "note": "$5-10 per transfer" },
      { "m": "Credit/Debit card", "fee": 0.03, "fee_max": 0.04, "note": "3-4% via 3rd-party" }
    ],
    "supported_networks": ["TRC20", "ERC20", "SOL", "Arbitrum", "Optimism", "Polygon"],
    "has_trading_bot": false,
    "has_api": true,
    "has_copy_trading": false,
    "new_user_note": "Kraken Pro Tier 1 spot 0.40%/0.80% from July 9, 2026. USDT network fees vary materially by chain; no P2P.",
    "source": "https://support.kraken.com/articles/cross-platform-fee-tier-changes",
    "last_updated": "2026-08-27",
    "evidence": {
      "trading_fees": {"url":"https://support.kraken.com/articles/cross-platform-fee-tier-changes","checked_at":"2026-08-27"},
      "withdrawal_fees": {"url":"https://support.kraken.com/articles/360000767986-cryptocurrency-withdrawal-fees-and-minimums","checked_at":"2026-08-20"},
      "kyc": {"url":"https://support.kraken.com/articles/201352206-verification-level-requirements","checked_at":"2026-08-20"},
      "regulation": {"url":"https://www.kraken.com/legal/disclosures","checked_at":"2026-08-20"},
      "reserves": {"url":"https://www.kraken.com/proof-of-reserves","checked_at":"2026-08-20"}
    },
    "slogan": {"en": "Where the world trades crypto", "zh": "全球加密交易之地"},
    "token_discount": null,
    "vip_tiers": [{"t": "Tier 1", "th": "$0+", "sm": 0.004, "st": 0.008, "fm": 0.0002, "ft": 0.0005}, {"t": "Tier 2", "th": "≥ $2.5K", "sm": 0.003, "st": 0.006, "fm": 0.000175, "ft": 0.00045}, {"t": "Tier 3", "th": "≥ $10K", "sm": 0.0022, "st": 0.0038, "fm": 0.00015, "ft": 0.0004}, {"t": "Tier 4", "th": "≥ $25K", "sm": 0.002, "st": 0.0035, "fm": 0.000125, "ft": 0.00035}, {"t": "Tier 5", "th": "≥ $50K", "sm": 0.0015, "st": 0.003, "fm": 0.0001, "ft": 0.0003}],
  },
  "coinbase": {
    "slug": "coinbase",
    "name": "Coinbase",
    "official_url": "https://www.coinbase.com",
    "spot":      { "maker": 0.0040, "taker": 0.0060 },
    "futures":   { "maker": 0.0000, "taker": 0.0003 },
    "withdrawal_fees": { "ERC20": {"amount":null,"model":"unknown"}, "BSC": {"amount":null,"model":"unknown"}, "Base": {"amount":null,"model":"unknown"}, "Arbitrum": {"amount":null,"model":"unknown"}, "Polygon": {"amount":null,"model":"unknown"} },
    "withdrawal_processing": {"rate":0.0001,"cap":20,"model":"percentage_with_cap"},
    "withdrawal_note": "No TRC20 USDT; network fee is dynamic; USDT processing fee 0.01% (max 20 USDT) applies separately",
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
    "last_updated": "2026-08-27",
    "evidence": {
      "trading_fees": {"url":"https://help.coinbase.com/en/coinbase/trading-and-funding/advanced-trade/advanced-trade-fees","checked_at":"2026-08-27","access":"account_tier"},
      "withdrawal_fees": {"url":"https://help.coinbase.com/en/coinbase/trading-and-funding/pricing-and-fees/fees","checked_at":"2026-08-20","access":"dynamic_quote"},
      "kyc": {"url":"https://help.coinbase.com/en/coinbase/getting-started/verify-my-account/how-do-i-verify-my-identity","checked_at":"2026-08-20"},
      "regulation": {"url":"https://www.coinbase.com/legal/licenses","checked_at":"2026-08-20"},
      "reserves": {"url":"https://investor.coinbase.com/financials/sec-filings/default.aspx","checked_at":"2026-08-20"}
    },
    "slogan": {"en": "The future of finance", "zh": "金融的未来"},
    "token_discount": null,
    "vip_tiers": [{"t": "Tier 1", "th": "< $10K", "sm": 0.004, "st": 0.006, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 2", "th": "≥ $10K", "sm": 0.0035, "st": 0.0035, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 3", "th": "≥ $50K", "sm": 0.0025, "st": 0.003, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 4", "th": "≥ $100K", "sm": 0.0015, "st": 0.002, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 5", "th": "≥ $1M", "sm": 0.0005, "st": 0.001, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 6", "th": "≥ $10M", "sm": 0.0, "st": 0.0005, "fm": 0.0, "ft": 0.0003}],
  }
};

// 辅助：返回某所某网络的 USDT 提币费；不支持返回 null
window.getUsdtWithdrawalFee = function (slug, network) {
  const ex = window.EXCHANGES[slug];
  if (!ex) return null;
  const fee = ex.withdrawal_fees && ex.withdrawal_fees[network];
  return fee && fee.amount != null ? fee.amount : null;
};
// 返回指定提现金额下的完整费用报价：网络费快照 + 按金额处理费。
window.getUsdtWithdrawalQuote = function (slug, network, amount) {
  const ex = window.EXCHANGES[slug];
  const fee = ex && ex.withdrawal_fees && ex.withdrawal_fees[network];
  if (!ex || !fee || fee.amount == null) return null;
  const value = Number(amount);
  const processing = ex.withdrawal_processing || null;
  const processingFee = processing && Number.isFinite(value) && value >= 0
    ? Math.min(value * processing.rate, processing.cap == null ? Infinity : processing.cap)
    : 0;
  return {
    network,
    network_fee: fee.amount,
    processing_fee: processingFee,
    total: fee.amount + processingFee,
    model: fee.model || 'snapshot',
    estimated: String(fee.model || '').includes('dynamic'),
    checked_at: ex.evidence && ex.evidence.withdrawal_fees ? ex.evidence.withdrawal_fees.checked_at : ex.last_updated,
    source: ex.evidence && ex.evidence.withdrawal_fees ? ex.evidence.withdrawal_fees.url : ex.source
  };
};
window.getUsdtWithdrawalNetworks = function (slug) {
  const ex = window.EXCHANGES[slug];
  return ex ? Object.keys(ex.withdrawal_fees || {}) : [];
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
    "kyc": {"en": "Mandatory", "zh": "强制 KYC"}, "licenses": {"en": "Seychelles + AU + EU (Estonia) + Bermuda", "zh": "塞舌尔 + 澳大利亚 + 欧盟（爱沙尼亚）+ 百慕大"},
    "reserve": {"en": "100%+ (PoR)", "zh": "100%+（储备证明 PoR）"}, "cold": {"en": "95%+", "zh": "95%+"}, "incident": {"en": "2020 $281M hack (fully compensated)", "zh": "2020 年 2.81 亿美元被盗（已全额赔付）"}
  },
  "binance": {
    "max_leverage": 125, "has_options": true, "has_leveraged_tokens": true, "has_margin": true, "coins": 486, "volume": "≈$5.5B", "trust": 10, "security": 9,
    "kyc": {"en": "Mandatory", "zh": "强制 KYC"}, "licenses": {"en": "ADGM Abu Dhabi + VARA Dubai + multiple (no EU MiCA)", "zh": "阿布扎比 ADGM + 迪拜 VARA + 其他牌照（欧盟无 MiCA）"},
    "reserve": {"en": "~101% (PoR)", "zh": "约 101%（储备证明 PoR）"}, "cold": {"en": "~95% (est.)", "zh": "约 95%（估算）"}, "incident": {"en": "2019 $40M hack (compensated); 2023 US DOJ AML settlement", "zh": "2019 年 4000 万美元被盗（已赔付）；2023 年美国司法部反洗钱和解"}
  },
  "bybit": {
    "max_leverage": 100, "has_options": true, "has_leveraged_tokens": false, "has_margin": true, "coins": 411, "volume": "≈$1.1B", "trust": 9, "security": 7,
    "kyc": {"en": "Mandatory", "zh": "强制 KYC"}, "licenses": {"en": "VARA Dubai + EU (MiCA)", "zh": "迪拜 VARA + 欧盟（MiCA）"},
    "reserve": {"en": ">100% (Hacken)", "zh": ">100%（Hacken 审计）"}, "cold": {"en": "95%", "zh": "95%"}, "incident": {"en": "2025 Feb $1.46B hack (fully compensated)", "zh": "2025 年 2 月 14.6 亿美元被盗（已全额赔付）"}
  },
  "okx": {
    "max_leverage": 100, "has_options": true, "has_leveraged_tokens": true, "has_margin": true, "coins": 306, "volume": "≈$1.15B", "trust": 10, "security": 9,
    "kyc": {"en": "Mandatory", "zh": "强制 KYC"}, "licenses": {"en": "Malta (EU MiCA) + VARA Dubai + Singapore MAS; HK VASP application withdrawn", "zh": "马耳他（欧盟 MiCA）+ 迪拜 VARA + 新加坡 MAS；香港 VASP 申请已撤回"},
    "reserve": {"en": "105% / 112%", "zh": "105% / 112%"}, "cold": {"en": "95%+", "zh": "95%+"}, "incident": {"en": "No hack; 2025 US DOJ settlement (AML)", "zh": "无黑客事件；2025 年美国司法部反洗钱和解"}
  },
  "bitget": {
    "max_leverage": 125, "has_options": true, "has_leveraged_tokens": true, "has_margin": true, "coins": 538, "volume": "≈$0.44B", "trust": 10, "security": 8,
    "kyc": {"en": "Mandatory for core services", "zh": "核心服务强制 KYC"}, "licenses": {"en": "EU MiCAR application submitted to Austria FMA (not yet approved)", "zh": "已向奥地利 FMA 提交欧盟 MiCAR 申请（尚未获批）"},
    "reserve": {"en": "123–163%", "zh": "123–163%"}, "cold": {"en": "95%", "zh": "95%"}, "incident": {"en": "No external hack", "zh": "无外部黑客事件"}
  },
  "kraken": {
    "max_leverage": 50, "has_options": false, "has_leveraged_tokens": false, "has_margin": true, "coins": 735, "volume": "≈$0.7B", "trust": 10, "security": 10,
    "kyc": {"en": "Strict (US-licensed)", "zh": "严格（美国持牌）"}, "licenses": {"en": "US + EU (MiCA) + UK + Canada", "zh": "美国 + 欧盟（MiCA）+ 英国 + 加拿大"},
    "reserve": {"en": "~101% (PoR)", "zh": "约 101%（储备证明 PoR）"}, "cold": {"en": "95%", "zh": "95%"}, "incident": {"en": "No major hack", "zh": "无重大黑客事件"}
  },
  "coinbase": {
    "max_leverage": 10, "has_options": false, "has_leveraged_tokens": false, "has_margin": true, "coins": 404, "volume": "≈$0.80B", "trust": 10, "security": 9,
    "kyc": {"en": "Strict (US-listed)", "zh": "严格（美国上市）"}, "licenses": {"en": "US (NYSE) + EU + UK", "zh": "美国（NYSE）+ 欧盟 + 英国"},
    "reserve": {"en": "Public audits (no PoR)", "zh": "公开审计（无 PoR）"}, "cold": {"en": "98%+", "zh": "98%+"}, "incident": {"en": "No hack; 2024 customer data breach", "zh": "无黑客事件；2024 年客户数据泄露"}
  }
};
