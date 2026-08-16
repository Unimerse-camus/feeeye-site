// Cloudflare Pages Function — 代理 KuCoin 实时价格（方案 B：无需 API key）
// 前端同域请求 /api/price?symbols=BTC,ETH,SOL
// 服务端请求 KuCoin 公开行情（无 CORS、无 key、限流宽松），返回 {BTC:{usd:...},...}
// 若某币无 USDT 交易对或 KuCoin 未收录，则不返回该 symbol，前端自动回退本地快照价

const CORS = { 'content-type': 'application/json;charset=utf-8', 'access-control-allow-origin': '*' };

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const raw = url.searchParams.get('symbols') || '';
  const symbols = raw.toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
  if (!symbols.length) return json({ error: 'missing symbols' }, 400);

  const wanted = {};
  symbols.forEach(s => { wanted[s] = true; });

  try {
    const kc = await fetch('https://api.kucoin.com/api/v1/market/allTickers', {
      headers: { accept: 'application/json', 'user-agent': 'FeeEye/1.0 (https://feeeye.com)' }
    });
    if (!kc.ok) return json({ error: 'upstream status ' + kc.status }, 502);
    const data = await kc.json();
    const tickers = (data && data.data && data.data.ticker) || [];

    const result = {};
    tickers.forEach(t => {
      const sym = t.symbol || '';
      // 只取 USDT 计价交易对（BTC-USDT → BTC）
      if (sym.endsWith('-USDT')) {
        const base = sym.slice(0, -5);
        if (wanted[base] && !(base in result)) {
          const last = parseFloat(t.last);
          if (last > 0) result[base] = { usd: last };
        }
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS, 'cache-control': 'public, max-age=30' }
    });
  } catch (e) {
    return json({ error: 'upstream failed' }, 502);
  }
}
