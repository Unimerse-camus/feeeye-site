/*
 * country_availability.js — 国家 × 交易所可用性（P0/P1 合规核心）
 * =========================================================
 * available: true/false 表示该所在该国/地区是否可向居民提供服务。
 * restricted: 若为 true，该国家整体为 KuCoin 等所的 Restricted Location，
 *             前端必须隐藏所有注册 CTA，绝不提供绕过引导。
 * 数据以各所当前 Terms of Use 为准；KuCoin 限制清单会变动，需动态维护并标更新时间。
 * 已明确排除：CN(中国大陆)、HK(中国香港)、US(美国)、SG(新加坡) 等 Restricted Locations。
 */

window.COUNTRY_AVAILABILITY = {
  "CN": { "restricted": true,  "note": "Restricted Location — 不提供服务", "exchanges": {} },
  "HK": { "restricted": true,  "note": "Restricted Location — 不提供服务", "exchanges": {} },
  "US": { "restricted": true,  "note": "Restricted Location — 不提供服务", "exchanges": {} },
  "SG": { "restricted": true,  "note": "Restricted Location — 不提供服务", "exchanges": {} },

  "DE": { "restricted": false, "exchanges": { "kucoin": false, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true }, "note": "KuCoin paused new-client onboarding in EU (Austria FMA, Feb 2026)" },
  "GB": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true } },
  "FR": { "restricted": false, "exchanges": { "kucoin": false, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true }, "note": "KuCoin paused new-client onboarding in EU (Austria FMA, Feb 2026)" },
  "JP": { "restricted": false, "exchanges": { "kucoin": true, "binance": false, "bybit": true, "okx": true, "bitget": false, "kraken": true, "coinbase": true } },
  "BR": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": true } },
  "IN": { "restricted": false, "exchanges": { "kucoin": true, "binance": false, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": true } },
  "AU": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true } },
  "CA": { "restricted": false, "exchanges": { "kucoin": true, "binance": false, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true } },
  "NG": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": true } },
  "TR": { "restricted": false, "exchanges": { "kucoin": true, "binance": false, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": false } },
  "AE": { "restricted": false, "exchanges": { "kucoin": true, "binance": false, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": true } },
  "PH": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": true } },
  "ID": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": false } },
  "VN": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": false } },
  "MX": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": true } },
  "ZA": { "restricted": false, "exchanges": { "kucoin": true, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": true } },
  "KR": { "restricted": false, "exchanges": { "kucoin": true, "binance": false, "bybit": true, "okx": true, "bitget": false, "kraken": false, "coinbase": false } },
  "TH": { "restricted": false, "exchanges": { "kucoin": true, "binance": false, "bybit": true, "okx": true, "bitget": true, "kraken": false, "coinbase": false } },
  "PL": { "restricted": false, "exchanges": { "kucoin": false, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true }, "note": "KuCoin paused new-client onboarding in EU (Austria FMA, Feb 2026)" },
  "ES": { "restricted": false, "exchanges": { "kucoin": false, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true }, "note": "KuCoin paused new-client onboarding in EU (Austria FMA, Feb 2026)" },
  "IT": { "restricted": false, "exchanges": { "kucoin": false, "binance": true, "bybit": true, "okx": true, "bitget": true, "kraken": true, "coinbase": true }, "note": "KuCoin paused new-client onboarding in EU (Austria FMA, Feb 2026)" }
};

window.COUNTRY_NAMES = {
  "CN":"China","HK":"Hong Kong","US":"United States","SG":"Singapore",
  "DE":"Germany","GB":"United Kingdom","FR":"France","JP":"Japan","BR":"Brazil",
  "IN":"India","AU":"Australia","CA":"Canada","NG":"Nigeria","TR":"Turkey",
  "AE":"United Arab Emirates","PH":"Philippines","ID":"Indonesia","VN":"Vietnam",
  "MX":"Mexico","ZA":"South Africa","KR":"South Korea","TH":"Thailand","PL":"Poland",
  "ES":"Spain","IT":"Italy"
};

window.LAST_UPDATED_COUNTRY = "2026-08-12";
