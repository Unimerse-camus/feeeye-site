// Cloudflare Pages Function — 代理 CoinGecko search（symbol → cg_id）
// 前端同域请求 /api/search?query=BOME
// 用于"任意小币种"的 symbol 解析

const CORS = { 'content-type': 'application/json;charset=utf-8', 'access-control-allow-origin': '*' };

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('query') || '';
  if (!q) return json({ error: 'missing query' }, 400);

  const headers = { accept: 'application/json' };
  const key = context.env && context.env.COINGECKO_API_KEY;
  if (key) headers['x-cg-demo-api-key'] = key;

  try {
    const cg = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      { headers }
    );
    const data = await cg.json();
    return new Response(JSON.stringify(data), {
      status: cg.status,
      headers: { ...CORS, 'cache-control': 'public, max-age=300' }
    });
  } catch (e) {
    return json({ error: 'upstream failed' }, 502);
  }
}
