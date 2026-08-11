/*
 * coins.js — 币种 × 交易所支持关系（P1 数据底座）
 * =========================================================
 * exchanges 字段列出「在该所现货可交易的所 slug」。
 * 程序化页面 /where-to-buy/[symbol] 与 /coins/[symbol] 由本表 + exchanges.js 生成。
 * 上线前用 CoinGecko API 每日刷新 symbol/name/contract/networks，
 * 并用各所官方上币列表核实 exchanges 字段。
 */

window.COINS = {
  "BTC":   { "name": "Bitcoin",   "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["BTC"], "last_updated": "2026-08-08" },
  "ETH":   { "name": "Ethereum",  "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["ERC20","Arbitrum","Base","Optimism"], "last_updated": "2026-08-08" },
  "USDT":  { "name": "Tether",    "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["TRC20","ERC20","BSC","SOL","Arbitrum","Base"], "last_updated": "2026-08-08" },
  "SOL":   { "name": "Solana",    "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["SOL"], "last_updated": "2026-08-08" },
  "BNB":   { "name": "BNB",       "exchanges": ["kucoin","binance","okx","bitget"], "networks": ["BSC"], "last_updated": "2026-08-08" },
  "XRP":   { "name": "XRP",       "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["XRP"], "last_updated": "2026-08-08" },
  "PEPE":  { "name": "Pepe",      "exchanges": ["kucoin","binance","bybit","okx","bitget"], "networks": ["ERC20"], "last_updated": "2026-08-08" },
  "DOGE":  { "name": "Dogecoin",  "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["DOGE"], "last_updated": "2026-08-08" },
  "TAO":   { "name": "Bittensor", "exchanges": ["kucoin","binance","bybit","okx"], "networks": ["ERC20"], "last_updated": "2026-08-08" },
  "ARB":   { "name": "Arbitrum",  "exchanges": ["kucoin","binance","bybit","okx","bitget","coinbase"], "networks": ["Arbitrum"], "last_updated": "2026-08-08" },
  "OP":    { "name": "Optimism",  "exchanges": ["kucoin","binance","bybit","okx","bitget","coinbase"], "networks": ["Optimism"], "last_updated": "2026-08-08" },
  "SUI":   { "name": "Sui",       "exchanges": ["kucoin","binance","bybit","okx","bitget"], "networks": ["SUI"], "last_updated": "2026-08-08" },
  "TON":   { "name": "Toncoin",   "exchanges": ["kucoin","bybit","okx","bitget"], "networks": ["TON"], "last_updated": "2026-08-08" },
  "WIF":   { "name": "dogwifhat", "exchanges": ["kucoin","binance","bybit","okx","bitget"], "networks": ["SOL"], "last_updated": "2026-08-08" },
  "INJ":   { "name": "Injective", "exchanges": ["kucoin","binance","bybit","okx","bitget"], "networks": ["INJ"], "last_updated": "2026-08-08" },
  "SEI":   { "name": "Sei",       "exchanges": ["kucoin","binance","bybit","okx","bitget"], "networks": ["SEI"], "last_updated": "2026-08-08" },
  "APT":   { "name": "Aptos",     "exchanges": ["kucoin","binance","okx","bitget","coinbase"], "networks": ["APT"], "last_updated": "2026-08-08" },
  "LINK":  { "name": "Chainlink", "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["ERC20","Arbitrum"], "last_updated": "2026-08-08" },
  "AVAX":  { "name": "Avalanche", "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["AVAX","ERC20"], "last_updated": "2026-08-08" },
  "MATIC": { "name": "Polygon",   "exchanges": ["kucoin","binance","bybit","okx","bitget","kraken","coinbase"], "networks": ["Polygon","ERC20"], "last_updated": "2026-08-08" }
};
