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
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon", "TON", "NEAR"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "KuCoin base spot 0.10% (20% off with KCS). USDT-TRC20 withdraw 1.5 USDT. EU onboarding paused (Feb 2026); US banned (Mar 2026).",
    "source": "https://www.kucoin.com/vip/level + cexorer.com/kucoin/usdt",
    "last_updated": "2026-08-18",
    "slogan": {"en": "People's Exchange", "zh": "人民的交易所"},
    "token_discount": {"token": "KCS", "spot": 0.2, "futures": 0.2, "note": {"en": "Turn on KCS fee discount: Spot 20% off, Futures 20% off", "zh": "开启 KCS 抵扣手续费，现货抵扣 20%，合约抵扣 20%"}},
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
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 4.0, "BSC": 0.3, "SOL": 0.01, "Arbitrum": 0.1, "Base": 0.5, "Optimism": 0.1, "Polygon": 0.1 },
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
    "last_updated": "2026-08-18",
    "trust_badges": [
      {"type": "award",  "en": "Forbes 2025 Most Trusted Crypto Exchange",       "zh": "福布斯 2025 最受信赖加密交易所"},
      {"type": "award",  "en": "CNBC 2025 World Top Fintech",                   "zh": "CNBC 2025 全球顶级金融科技"},
      {"type": "award",  "en": "Fortune Crypto 40 — CeFi Leader",              "zh": "财富 Crypto 40——CeFi 领域领导者"},
      {"type": "volume", "en": "Daily trading volume: ~$65B",                  "zh": "日交易量约 650 亿美元"},
      {"type": "fund",   "en": "SAFU — Secure Asset Fund for Users ($1B)",     "zh": "SAFU 用户保护基金（10 亿美元）"},
      {"type": "support","en": "24/7 customer support · 40+ languages",        "zh": "7×24 客户支持 · 40+ 种语言"}
    ],
    "slogan": {"en": "The world's leading crypto exchange", "zh": "全球领先的加密货币交易所"},
    "token_discount": {"token": "BNB", "spot": 0.25, "futures": 0.1, "note": {"en": "Turn on BNB fee discount: Spot 25% off, Futures 10% off", "zh": "开启 BNB 抵扣手续费，现货抵扣 25%，合约抵扣 10%"}},
    "token_discount": {"token": "BNB", "spot": 0.25, "futures": 0.1, "note": {"en": "Turn on BNB fee discount: Spot 25% off, Futures 10% off", "zh": "开启 BNB 抵扣手续费，现货抵扣 25%，合约抵扣 10%"}},
    "vip_tiers": [{"t": "Regular", "th_spot": "< $1M", "th_futures": "< $5M", "sm": 0.001, "st": 0.001, "fm": 0.0002, "ft": 0.0005}, {"t": "VIP 1", "th_spot": "≥ $1M", "th_futures": "≥ $5M", "sm": 0.0009, "st": 0.001, "fm": 0.00016, "ft": 0.0004}, {"t": "VIP 2", "th_spot": "≥ $5M", "th_futures": "≥ $10M", "sm": 0.0008, "st": 0.001, "fm": 0.00014, "ft": 0.00035}, {"t": "VIP 3", "th_spot": "≥ $20M", "th_futures": "≥ $50M", "sm": 0.0004, "st": 0.0006, "fm": 0.00012, "ft": 0.00032}, {"t": "VIP 4", "th_spot": "≥ $75M", "th_futures": "≥ $600M", "sm": 0.0004, "st": 0.00052, "fm": 0.0001, "ft": 0.0003}, {"t": "VIP 5", "th_spot": "≥ $150M", "th_futures": "≥ $1B", "sm": 0.00025, "st": 0.00031, "fm": 6e-05, "ft": 0.00027}, {"t": "VIP 6", "th_spot": "≥ $400M", "th_futures": "≥ $2.5B", "sm": 0.0002, "st": 0.00029, "fm": 5e-05, "ft": 0.00025}, {"t": "VIP 7", "th_spot": "≥ $800M", "th_futures": "≥ $5B", "sm": 0.00019, "st": 0.00028, "fm": 4e-05, "ft": 0.00023}, {"t": "VIP 8", "th_spot": "≥ $2B", "th_futures": "≥ $12B", "sm": 0.00016, "st": 0.00025, "fm": 3e-05, "ft": 0.00021}, {"t": "VIP 9", "th_spot": "≥ $4B", "th_futures": "≥ $25B", "sm": 0.00011, "st": 0.00023, "fm": 0.0, "ft": 0.00017}]
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
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bybit base spot 0.10%. USDT-TRC20 1 USDT. Restricted: US/China/Singapore/etc.",
    "source": "https://www.bybit.com/en/help-center/fee",
    "last_updated": "2026-08-18",
    "slogan": {"en": "Trade with confidence", "zh": "自信交易，掌控市场"},
    "token_discount": {"token": "BIT", "spot": 0.2, "futures": 0.2, "note": {"en": "Turn on BIT fee discount: Spot 20% off, Futures 20% off", "zh": "开启 BIT 抵扣手续费，现货抵扣 20%，合约抵扣 20%"}},
    "vip_tiers": [{"t": "VIP 0", "th": "< $100K", "sm": 0.001, "st": 0.001, "fm": 0.0002, "ft": 0.00055}, {"t": "VIP 1", "th": "≥ $1M", "sm": 0.0006, "st": 0.0008, "fm": 0.00015, "ft": 0.0004}, {"t": "VIP 2", "th": "≥ $5M", "sm": 0.0004, "st": 0.0006, "fm": 0.0001, "ft": 0.00032}, {"t": "VIP 3", "th": "≥ $10M", "sm": 0.0002, "st": 0.0004, "fm": 5e-05, "ft": 0.00022}, {"t": "Pro 4", "th": "≥ $50M", "sm": 0.0001, "st": 0.0003, "fm": 0.0, "ft": 0.00015}, {"t": "Pro 5", "th": "≥ $100M", "sm": 5e-05, "st": 0.0002, "fm": 0.0, "ft": 0.0001}],
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
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "OKX spot 0.08%/0.10% (Lv1). USDT-TRC20 1 USDT. Mainland-China KYC status changing (2026).",
    "source": "https://www.okx.com/fees",
    "last_updated": "2026-08-18",
    "slogan": {"en": "Trade smarter, live better", "zh": "交易更聪明，生活更精彩"},
    "token_discount": {"token": "OKB", "spot": 0.2, "futures": 0.2, "note": {"en": "Turn on OKB fee discount: Spot 20% off, Futures 20% off", "zh": "开启 OKB 抵扣手续费，现货抵扣 20%，合约抵扣 20%"}},
    "vip_tiers": [{"t": "Regular", "th": "< $100K", "sm": 0.0008, "st": 0.001, "fm": 0.0002, "ft": 0.0005}, {"t": "VIP 1", "th": "≥ $100K", "sm": 0.0006, "st": 0.0009, "fm": 0.00018, "ft": 0.00045}, {"t": "VIP 2", "th": "≥ $500K", "sm": 0.0005, "st": 0.0008, "fm": 0.00016, "ft": 0.0004}, {"t": "VIP 3", "th": "≥ $2M", "sm": 0.0003, "st": 0.0006, "fm": 0.00014, "ft": 0.00036}, {"t": "VIP 4", "th": "≥ $5M", "sm": 0.0002, "st": 0.0005, "fm": 0.00012, "ft": 0.00032}, {"t": "VIP 5", "th": "≥ $10M", "sm": 0.0, "st": 0.0004, "fm": 0.0001, "ft": 0.00028}, {"t": "VIP 6", "th": "≥ $20M", "sm": -5e-05, "st": 0.00035, "fm": 8e-05, "ft": 0.00025}, {"t": "VIP 7", "th": "≥ $50M", "sm": -0.0001, "st": 0.0003, "fm": 6e-05, "ft": 0.00022}, {"t": "VIP 8", "th": "≥ $1B", "sm": -0.00015, "st": 0.00025, "fm": 4e-05, "ft": 0.00019}],
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
      { "m": "P2P", "fee": 0, "note": "0% fee" }
    ],
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bitget base spot 0.10% (20% off with BGB). USDT-TRC20 1.5 USDT.",
    "source": "https://www.bitget.com/fee",
    "last_updated": "2026-08-18",
    "slogan": {"en": "Smarter trading, better life", "zh": "更聪明的交易，更精彩的生活"},
    "trust_badges": [{"type": "fund", "en": "Bitget Protection Fund ($300M+)", "zh": "Bitget 保护基金（3 亿美元以上）"}, {"type": "support", "en": "24/7 · multilingual", "zh": "24/7 · 多语言客服"}],
    "token_discount": {"token": "BGB", "spot": 0.2, "futures": 0.2, "note": {"en": "Turn on BGB fee discount: Spot 20% off, Futures 20% off", "zh": "开启 BGB 抵扣手续费，现货抵扣 20%，合约抵扣 20%"}},
    "vip_tiers": [{"t": "VIP 0", "th": "< $50K", "sm": 0.001, "st": 0.001, "fm": 0.0002, "ft": 0.0006}, {"t": "VIP 1", "th": "≥ $1M", "sm": 0.0006, "st": 0.0008, "fm": 0.00014, "ft": 0.0004}, {"t": "VIP 2", "th": "≥ $5M", "sm": 0.0005, "st": 0.0007, "fm": 0.00012, "ft": 0.00035}, {"t": "VIP 3", "th": "≥ $10M", "sm": 0.0003, "st": 0.0005, "fm": 8e-05, "ft": 0.0003}, {"t": "VIP 4", "th": "≥ $20M", "sm": 0.0002, "st": 0.0004, "fm": 6e-05, "ft": 0.00025}, {"t": "VIP 5", "th": "≥ $50M", "sm": 0.0001, "st": 0.0003, "fm": 4e-05, "ft": 0.0002}, {"t": "VIP 6", "th": "≥ $100M", "sm": 5e-05, "st": 0.00025, "fm": 2e-05, "ft": 0.00017}],
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
    "last_updated": "2026-08-18",
    "slogan": {"en": "Where the world trades crypto", "zh": "全球加密交易之地"},
    "token_discount": null,
    "vip_tiers": [{"t": "Standard", "th": "< $50K", "sm": 0.0025, "st": 0.004, "fm": 0.0002, "ft": 0.0005}, {"t": "≥ $50K", "th": "30天量", "sm": 0.002, "st": 0.0035, "fm": 0.00018, "ft": 0.00045}, {"t": "≥ $100K", "th": "30天量", "sm": 0.0016, "st": 0.0026, "fm": 0.00016, "ft": 0.0004}, {"t": "≥ $1M", "th": "30天量", "sm": 0.0012, "st": 0.0022, "fm": 0.00012, "ft": 0.00032}, {"t": "≥ $10M", "th": "30天量", "sm": 0.0008, "st": 0.0016, "fm": 8e-05, "ft": 0.00025}],
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
    "last_updated": "2026-08-18",
    "slogan": {"en": "The future of finance", "zh": "金融的未来"},
    "token_discount": null,
    "vip_tiers": [{"t": "Tier 1", "th": "< $10K", "sm": 0.004, "st": 0.006, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 2", "th": "≥ $10K", "sm": 0.0035, "st": 0.0035, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 3", "th": "≥ $50K", "sm": 0.0025, "st": 0.003, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 4", "th": "≥ $100K", "sm": 0.0015, "st": 0.002, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 5", "th": "≥ $1M", "sm": 0.0005, "st": 0.001, "fm": 0.0, "ft": 0.0003}, {"t": "Tier 6", "th": "≥ $10M", "sm": 0.0, "st": 0.0005, "fm": 0.0, "ft": 0.0003}],
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
