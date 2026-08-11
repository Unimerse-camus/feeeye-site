/*
 * exchanges.js — 交易所费率与能力数据层（P1 数据底座）
 * =========================================================
 * 重要：KuCoin 费率已于 2026-08-11 按官方费率文档核实（现货基础档 0.10/0.10、合约 0.02/0.06、
 * USDT 提币 TRC20 ~1 / ERC20 ~4）。其余交易所仍为种子数据，上线前须逐条对照各所官方文档核实。
 * 禁止编造优惠。
 * 监管动态（2026）：KuCoin 2026-02 奥地利 FMA 暂停欧盟新客户 onboarding；2026-03 CFTC 美国永久禁令。
 * 字段命名统一，供 /tools 计算器与 /exchanges/[x] 程序化页面共用。
 */

window.EXCHANGES = {
  "kucoin": {
    "slug": "kucoin",
    "name": "KuCoin",
    "affiliate_link": "https://www.kucoin.com/r/af/HODL100", // 待 P0 确认为正式 Affiliate link
    "spot":      { "maker": 0.0010, "taker": 0.0010 }, // 官方基础档 0.10% (KCS 支付折 0.08%)
    "futures":   { "maker": 0.0002, "taker": 0.0006 }, // 官方 0.02%/0.06%
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 4.0, "BSC": 0.8, "SOL": 0.1, "Arbitrum": 0.6, "Base": 0.6 }, // TRC20 ~1 / ERC20 ~4 USDT
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "KuCoin base spot fee 0.10% (20% off when paid in KCS). EU new-client onboarding paused since Feb 2026 (Austria FMA); US permanently banned (CFTC, Mar 2026).",
    "source": "https://www.kucoin.com/vip/level",
    "last_updated": "2026-08-11"
  },
  "binance": {
    "slug": "binance",
    "name": "Binance",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0004 },
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 5.58, "BSC": 0.8, "SOL": 0.02, "Arbitrum": 0.38, "Base": 0.38 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Binance regularly runs fee discounts via BNB.",
    "source": "https://www.binance.com/en/fee/schedule",
    "last_updated": "2026-08-08"
  },
  "bybit": {
    "slug": "bybit",
    "name": "Bybit",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0001, "taker": 0.0006 },
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 12.0, "BSC": 0.5, "SOL": 0.05, "Arbitrum": 0.3, "Base": 0.3 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Check Bybit official promos for new users.",
    "source": "https://www.bybit.com/en/help-center/fee",
    "last_updated": "2026-08-08"
  },
  "okx": {
    "slug": "okx",
    "name": "OKX",
    "spot":      { "maker": 0.0008, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 10.0, "BSC": 0.5, "SOL": 0.05, "Arbitrum": 0.3, "Base": 0.3 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "See OKX official campaigns.",
    "source": "https://www.okx.com/fees",
    "last_updated": "2026-08-08"
  },
  "bitget": {
    "slug": "bitget",
    "name": "Bitget",
    "spot":      { "maker": 0.0010, "taker": 0.0010 },
    "futures":   { "maker": 0.0002, "taker": 0.0006 },
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 11.0, "BSC": 0.6, "SOL": 0.05, "Arbitrum": 0.3, "Base": 0.3 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "See Bitget official promos.",
    "source": "https://www.bitget.com/fee",
    "last_updated": "2026-08-08"
  },
  "kraken": {
    "slug": "kraken",
    "name": "Kraken",
    "spot":      { "maker": 0.0025, "taker": 0.0040 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "usdt_withdrawal": { "TRC20": 2.0, "ERC20": 8.0, "BSC": 1.5, "SOL": 0.01, "Arbitrum": 0.25, "Polygon": 0.8 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Polygon"],
    "has_trading_bot": false,
    "has_api": true,
    "has_copy_trading": false,
    "new_user_note": "Kraken Pro has volume-based fee tiers.",
    "source": "https://www.kraken.com/features/fee-schedule",
    "last_updated": "2026-08-08"
  },
  "coinbase": {
    "slug": "coinbase",
    "name": "Coinbase",
    "spot":      { "maker": 0.0040, "taker": 0.0060 },
    "futures":   { "maker": 0.0002, "taker": 0.0005 },
    "usdt_withdrawal": { "TRC20": 2.0, "ERC20": 6.0, "BSC": 1.0, "Base": 0.2, "Arbitrum": 0.2 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "Base", "Arbitrum", "Polygon"],
    "has_trading_bot": false,
    "has_api": true,
    "has_copy_trading": false,
    "new_user_note": "Coinbase Advanced Trade has lower fees than retail.",
    "source": "https://www.coinbase.com/fees",
    "last_updated": "2026-08-08"
  }
};

// 辅助：返回某所某网络的 USDT 提币费；不支持返回 null
window.getUsdtWithdrawalFee = function (slug, network) {
  const ex = window.EXCHANGES[slug];
  if (!ex) return null;
  return ex.usdt_withdrawal[network] != null ? ex.usdt_withdrawal[network] : null;
};
