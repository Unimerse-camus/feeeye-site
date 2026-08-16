// 临时调试版：返回 KuCoin 对 BTC-USDT 的原始响应，定位 Cloudflare → KuCoin 失败原因
const CORS = { 'content-type': 'application/json;charset=utf-8', 'access-control-allow-origin': '*' };

export async function onRequestGet(context) {
  try {
    const r = await fetch('https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT', {
      headers: { accept: 'application/json', 'user-agent': 'FeeEye/1.0' }
    });
    const body = await r.text();
    return new Response(JSON.stringify({
      status: r.status,
      ok: r.ok,
      contentType: r.headers.get('content-type'),
      body: body.slice(0, 300)
    }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({
      error: e.message,
      stack: (e.stack || '').slice(0, 300)
    }), { status: 200, headers: CORS });
  }
}
