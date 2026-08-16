// Cloudflare Pages Function — 代理 CoinGecko 实时价格
// 前端同域请求 /api/price?ids=bitcoin,ethereum&vs_currencies=usd
// 服务端请求 CoinGecko（CoinGecko 用 AWS 非 Cloudflare，不会被 WAF 拦截）
// 需配 COINGECKO_API_KEY 环境变量（免费 Demo key）避免 429 限流

const CORS = { 'content-type': 'application/json;charset=utf-8', 'access-control-allow-origin': '*' };

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const ids = url.searchParams.get('ids') || '';
  const vs = url.searchParams.get('vs_currencies') || 'usd';
  if (!ids) return json({ error: 'missing ids' }, 400);

  const headers = { accept: 'application/json', 'user-agent': 'FeeEye/1.0 (https://feeeye.com)' };
  const key = context.env && context.env.COINGECKO_API_KEY;
  if (key) headers['x-cg-demo-api-key'] = key;

  try {
    const cg = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs)}`,
      { headers }
    );
    const data = await cg.json();
    // 短缓存 30s，减轻 CoinGecko 限频压力
    return new Response(JSON.stringify(data), {
      status: cg.status,
      headers: { ...CORS, 'cache-control': 'public, max-age=30' }
    });
  } catch (e) {
    return json({ error: 'upstream failed', ids }, 502);
  }
}
