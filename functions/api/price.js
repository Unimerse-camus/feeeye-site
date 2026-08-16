// Cloudflare Pages Function — 代理 KuCoin 实时价格（方案 B：无需 API key）
// 前端同域请求 /api/price?symbols=BTC,ETH,SOL
// 逐币并发请求 KuCoin 单币 ticker（响应小，避免 allTickers 大 JSON 触发 Workers CPU 超时）
// 若某币无 USDT 交易对或 KuCoin 未收录，则不返回该 symbol，前端自动回退本地快照价

const CORS = { 'content-type': 'application/json;charset=utf-8', 'access-control-allow-origin': '*' };

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const raw = url.searchParams.get('symbols') || '';
  const symbols = raw.toUpperCase().split(',').map(s => s.trim()).filter(Boolean).slice(0, 50);
  if (!symbols.length) return json({ error: 'missing symbols' }, 400);

  try {
    const pairs = await Promise.all(symbols.map(async (sym) => {
      try {
        const r = await fetch(
          `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${encodeURIComponent(sym)}-USDT`,
          { headers: { accept: 'application/json', 'user-agent': 'FeeEye/1.0' } }
        );
        if (!r.ok) return [sym, null];
        const d = await r.json();
        const p = d && d.data && d.data.price;
        return [sym, p ? parseFloat(p) : null];
      } catch (e) {
        return [sym, null];
      }
    }));

    const result = {};
    pairs.forEach(([sym, price]) => {
      if (price && price > 0) result[sym] = { usd: price };
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS, 'cache-control': 'public, max-age=30' }
    });
  } catch (e) {
    return json({ error: 'upstream failed' }, 502);
  }
}
