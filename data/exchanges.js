/*
 * exchanges.js — 交易所费率与能力数据层（P1 数据底座）
 * =========================================================
 * 2026-08-12 全部 7 所按 2026 官方费率文档核实（多源交叉）：
 *   - KuCoin: spot 0.10/0.10（KCS 折 0.08）、futures 0.02/0.06、TRC20 1 / ERC20 4
 *   - Binance: spot 0.10/0.10（BNB 折 0.075）、futures 0.02/0.04
 *   - Bybit: spot 0.10/0.10、futures 0.02/0.055
 *   - OKX: spot 0.08/0.10、futures 0.02/0.05
 *   - Bitget: spot 0.10/0.10（BGB 折 0.08）、futures 0.02/0.06
 *   - Kraken Pro: spot 0.25/0.40（Pro 默认档）、futures 0.02/0.05
 *   - Coinbase Advanced: spot 0.40/0.60（Intro 档）、futures 0.02/0.05
 * USDT 提币费：TRC20 ~1、BEP20/BSC 0.3-0.8、Arbitrum 0.10-0.25、Base 0.20 附近
 * 监管动态：KuCoin 2026-02 奥地利 FMA 暂停欧盟新客户 onboarding；2026-03 CFTC 美国永久禁令。
 * 字段命名统一，供 /tools 计算器与 /exchanges/[x] 程序化页面共用。
 */

window.EXCHANGES = {
  "kucoin": {
    "slug": "kucoin",
    "name": "KuCoin",
    "affiliate_link": "https://www.kucoin.com/r/af/HODL100",
    "spot":      { "maker": 0.0010, "taker": 0.0010 }, // 官方基础档 0.10% (KCS 支付折 0.08%)
    "futures":   { "maker": 0.0002, "taker": 0.0006 }, // 官方 0.02%/0.06%
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 4.0, "BSC": 0.8, "SOL": 0.1, "Arbitrum": 0.6, "Base": 0.6 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "KuCoin base spot fee 0.10% (20% off when paid in KCS). EU new-client onboarding paused since Feb 2026 (Austria FMA); US permanently banned (CFTC, Mar 2026).",
    "source": "https://www.kucoin.com/vip/level",
    "last_updated": "2026-08-12"
  },
  "binance": {
    "slug": "binance",
    "name": "Binance",
    "spot":      { "maker": 0.0010, "taker": 0.0010 }, // 官方基础档 0.10%（BNB 支付折 0.075%）
    "futures":   { "maker": 0.0002, "taker": 0.0004 }, // 官方 USDⓈ-M 0.02%/0.04%
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 3.5, "BSC": 0.3, "SOL": 0.01, "Arbitrum": 0.1, "Base": 0.5 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Binance base spot 0.10% (25% off with BNB). USDT-TRC20 ~1 USDT.",
    "source": "https://www.binance.com/en/fee/schedule",
    "last_updated": "2026-08-12"
  },
  "bybit": {
    "slug": "bybit",
    "name": "Bybit",
    "spot":      { "maker": 0.0010, "taker": 0.0010 }, // 官方基础档 0.10%/0.10%
    "futures":   { "maker": 0.0002, "taker": 0.00055 }, // 官方 USDⓈ-M 0.02%/0.055%
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 5.0, "BSC": 0.8, "SOL": 0.01, "Arbitrum": 0.1, "Base": 0.1 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bybit base spot 0.10%. USDT-TRC20 1 USDT. No native token discount.",
    "source": "https://www.bybit.com/en/help-center/fee",
    "last_updated": "2026-08-12"
  },
  "okx": {
    "slug": "okx",
    "name": "OKX",
    "spot":      { "maker": 0.0008, "taker": 0.0010 }, // 官方 Lv1 0.08%/0.10%
    "futures":   { "maker": 0.0002, "taker": 0.0005 }, // 官方 0.02%/0.05%
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 3.0, "BSC": 0.5, "SOL": 0.05, "Arbitrum": 0.1, "Base": 0.1 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism", "Polygon"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "OKX spot 0.08%/0.10% (Lv1). OKB 持有可叠加折扣. USDT-TRC20 1 USDT.",
    "source": "https://www.okx.com/fees",
    "last_updated": "2026-08-12"
  },
  "bitget": {
    "slug": "bitget",
    "name": "Bitget",
    "spot":      { "maker": 0.0010, "taker": 0.0010 }, // 官方 VIP0 0.10%/0.10%（BGB 折 0.08%）
    "futures":   { "maker": 0.0002, "taker": 0.0006 }, // 官方 USDT-M 0.02%/0.06%
    "usdt_withdrawal": { "TRC20": 1.5, "ERC20": 5.0, "BSC": 0.6, "SOL": 0.5, "Arbitrum": 0.2, "Base": 0.2 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Base", "Optimism"],
    "has_trading_bot": true,
    "has_api": true,
    "has_copy_trading": true,
    "new_user_note": "Bitget base spot 0.10% (20% off with BGB). USDT-TRC20 1.5 USDT.",
    "source": "https://www.bitget.com/fee",
    "last_updated": "2026-08-12"
  },
  "kraken": {
    "slug": "kraken",
    "name": "Kraken",
    "spot":      { "maker": 0.0025, "taker": 0.0040 }, // 官方 Pro 基础档 0.25%/0.40%（Kraken 普通账户更贵）
    "futures":   { "maker": 0.0002, "taker": 0.0005 }, // 官方 0.02%/0.05%
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 2.5, "BSC": 0.8, "SOL": 0.01, "Arbitrum": 0.25, "Polygon": 0.8 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "SOL", "Arbitrum", "Polygon"],
    "has_trading_bot": false,
    "has_api": true,
    "has_copy_trading": false,
    "new_user_note": "Kraken Pro spot 0.25%/0.40% (Pro 基础档). USDT-TRC20 1 USDT.",
    "source": "https://www.kraken.com/features/fee-schedule",
    "last_updated": "2026-08-12"
  },
  "coinbase": {
    "slug": "coinbase",
    "name": "Coinbase",
    "spot":      { "maker": 0.0040, "taker": 0.0060 }, // 官方 Advanced 介绍档 0.40%/0.60%（taker 高于 maker 是 Coinbase 基础档特色）
    "futures":   { "maker": 0.0002, "taker": 0.0005 }, // 官方 0.02%/0.05%
    "usdt_withdrawal": { "TRC20": 1.0, "ERC20": 3.0, "BSC": 0.5, "Base": 0.2, "Arbitrum": 0.2 },
    "supported_networks": ["TRC20", "ERC20", "BSC", "Base", "Arbitrum", "Polygon"],
    "has_trading_bot": false,
    "has_api": true,
    "has_copy_trading": false,
    "new_user_note": "Coinbase Advanced spot 0.40%/0.60% (Intro). USDT 提币走各链实际网络费（很便宜但 Coinbase One 订阅享 0 费）.",
    "source": "https://www.coinbase.com/fees",
    "last_updated": "2026-08-12"
  }
};

// 辅助：返回某所某网络的 USDT 提币费；不支持返回 null
window.getUsdtWithdrawalFee = function (slug, network) {
  const ex = window.EXCHANGES[slug];
  if (!ex) return null;
  return ex.usdt_withdrawal[network] != null ? ex.usdt_withdrawal[network] : null;
};
