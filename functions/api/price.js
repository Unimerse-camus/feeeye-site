// Cloudflare Pages Function — 代理 CoinGecko 实时价格
// 前端同域请求 /api/price?ids=bitcoin,ethereum&vs_currencies=usd
// 绕开 CoinGecko 免费 API 的 CORS 限制（服务端请求无 CORS）
// 可选：在 Cloudflare 控制台配 COINGECKO_API_KEY 环境变量（免费 demo key），提升限频

const CORS = { 'content-type': 'application/json;charset=utf-8', 'access-control-allow-origin': '*' };

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const ids = url.searchParams.get('ids') || '';
  const vs = url.searchParams.get('vs_currencies') || 'usd';
  if (!ids) return json({ error: 'missing ids' }, 400);

  const headers = { accept: 'application/json' };
  const key = context.env && context.env.COINGECKO_API_KEY;
  if (key) headers['x-cg-demo-api-key'] = key;

  try {
    const cg = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs)}`,
      { headers }
    );
    const data = await cg.json();
    // 短缓存 30s，减轻 CoinGecko 限频压力
    const resp = new Response(JSON.stringify(data), {
      status: cg.status,
      headers: { ...CORS, 'cache-control': 'public, max-age=30' }
    });
    return resp;
  } catch (e) {
    return json({ error: 'upstream failed', ids }, 502);
  }
}
