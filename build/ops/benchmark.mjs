import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const snapshotURL = new URL('../../ops/automation/snapshots/1000-usdt-spot-cost-2026-08-27.json', import.meta.url);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function validateSnapshot(s) {
  if (s.schema_version !== 1 || s.id !== '1000-usdt-spot-cost' || !/^[a-z0-9-]+$/.test(s.version || '')) throw new Error('Invalid snapshot identity');
  if (s.notional !== 1000 || s.unit !== 'USDT-equivalent' || !s.provenance || !s.scope) throw new Error('Invalid benchmark scope');
  if (!dateValid(s.source_reviewed_at) || !dateValid(s.editorial_updated_at) || s.editorial_updated_at < s.source_reviewed_at) throw new Error('Invalid snapshot dates');
  if (JSON.stringify(s.exclusions) !== JSON.stringify(['spread','slippage','funding','withdrawal','tax'])) throw new Error('Missing exclusions');
  if (!Array.isArray(s.rows) || s.rows.length !== 7 || new Set(s.rows.map(r => r.slug)).size !== 7) throw new Error('Expected seven unique exchanges');
  for (const r of s.rows) {
    if (!/^[a-z]+$/.test(r.slug) || !r.name || !r.basis?.en || !r.basis?.zh) throw new Error('Invalid row identity or basis');
    if (!Number.isSafeInteger(r.rate_ppm) || r.rate_ppm <= 0 || r.rate_ppm > 100000 || !['published_rate','ceiling'].includes(r.kind)) throw new Error('Invalid fee model');
    const url = new URL(r.source);
    const host = {binance:'binance.com',okx:'okx.com',kucoin:'kucoin.com',bybit:'bybit.com',bitget:'bitget.com',coinbase:'coinbase.com',kraken:'kraken.com'}[r.slug];
    if (!host || url.protocol !== 'https:' || url.username || url.password || !(url.hostname === host || url.hostname.endsWith('.' + host))) throw new Error('Non-official source');
    if (!dateValid(r.verified_at) || r.verified_at > s.source_reviewed_at || (r.effective_at !== null && (!dateValid(r.effective_at) || r.effective_at > r.verified_at))) throw new Error('Invalid evidence date');
  }
  return s;
}
export const snapshot = validateSnapshot(JSON.parse(fs.readFileSync(snapshotURL, 'utf8')));
export const snapshotHash = digest(JSON.stringify(snapshot));
export function benchmarkRows(s = snapshot) {
  validateSnapshot(s);
  return s.rows.map(r => ({...r, rate: r.rate_ppm / 1000000, fee: s.notional * r.rate_ppm / 1000000}));
}
export const rateText = r => (r.rate_ppm / 10000).toFixed(2) + '%';
export const feeText = (r, lang) => `${r.kind === 'ceiling' ? (lang === 'zh' ? '最高 ' : 'up to ') : ''}${r.fee.toFixed(2)}`;
export function chartSvg(lang, s = snapshot) {
  const zh = lang === 'zh', rows = benchmarkRows(s), max = Math.max(...rows.map(r => r.fee));
  const title = zh ? '1000 USDT等值现货：公开基础吃单费' : '1,000 USDT-equivalent: published spot taker fees';
  const subtitle = zh ? `历史快照 ${s.source_reviewed_at} · 普通档 · 标准交易对 · 无折扣` : `Historical snapshot ${s.source_reviewed_at} · entry tier · standard pairs · no discounts`;
  const bars = rows.map((r,i) => {
    const y = 183 + i * 48, width = 570 * r.fee / max;
    return `<text x="58" y="${y+22}" font-size="21">${escapeHtml(r.name)}</text><rect x="295" y="${y}" width="${width}" height="31" rx="7" fill="${r.kind === 'ceiling' ? '#6b7280' : '#2563eb'}"/><text x="${310+width}" y="${y+22}" font-size="19">${escapeHtml(feeText(r,lang))}</text>`;
  }).join('');
  const note1 = zh ? '单位：USDT等值；上限不是确定报价，实际扣费币种以订单为准。' : 'Units: USDT-equivalent; ceilings are not exact quotes. Fee asset varies by order.';
  const note2 = zh ? '非真实成交 / 非总成本：不含价差、滑点、入金、提币、税务。' : 'Not executed trades / not total cost: excludes spread, slippage, funding, withdrawal, tax.';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeHtml(title)}"><rect width="1200" height="630" fill="#f7f8fa"/><rect x="28" y="28" width="1144" height="574" rx="28" fill="white" stroke="#dbe3ee"/><g font-family="Arial,PingFang SC,sans-serif" fill="#172033"><text x="58" y="75" font-size="22" font-weight="700" fill="#2563eb">FeeEye · PUBLIC RATE SNAPSHOT</text><text x="58" y="121" font-size="32" font-weight="700">${escapeHtml(title)}</text><text x="58" y="152" font-size="18" fill="#64748b">${escapeHtml(subtitle)}</text>${bars}<text x="58" y="552" font-size="17">${escapeHtml(note1)}</text><text x="58" y="578" font-size="16">${escapeHtml(note2)}</text></g></svg>`;
}
// Content-address the actual SVG, so layout edits also invalidate immutable caches.
export const chartPath = lang => `/assets/benchmarks/${snapshot.id}-${lang}-${digest(chartSvg(lang)).slice(0,16)}.svg`;
export function findingsHtml(lang) {
  const zh = lang === 'zh';
  return benchmarkRows().map(r => `<div class="benchmark-finding"><b>${escapeHtml(r.name)}: ${escapeHtml(feeText(r,lang))} ${zh ? 'USDT等值' : 'USDT-equivalent'}</b><p>${escapeHtml(r.basis[lang])} · ${r.kind === 'ceiling' ? (zh ? '费率上限 ' : 'Rate ceiling ') : ''}${rateText(r)}</p></div>`).join('');
}
