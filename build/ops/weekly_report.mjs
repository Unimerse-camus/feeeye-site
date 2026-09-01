#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, validDay } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const metricKeys=['site_visits','search_clicks','search_impressions','ai_referral_visits','bing_ai_citations','bing_ai_average_cited_pages','x_posts_published','x_link_clicks','affiliate_clicks','affiliate_registrations','commission_usdt','human_hours'];
export function validateWeeklyInput(data) {
  const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort())) throw new Error('Unexpected fields: '+label);};
  exact(data,['schema_version','window','coverage','metrics','content','notes'],'root');
  exact(data.window,['from','to'],'window');
  if(data.schema_version!==1 || !validDay(data.window?.from) || !validDay(data.window?.to) || data.window.to<data.window.from || (Date.parse(data.window.to)-Date.parse(data.window.from))/86400000>7) throw new Error('Invalid weekly window');
  if(!data.coverage || !data.metrics || !Array.isArray(data.content) || !Array.isArray(data.notes)) throw new Error('Incomplete weekly input');
  for(const source of ['cloudflare','gsc','bing_ai','x','affiliate']) {
    const c=data.coverage[source];
    exact(c,['status','through','note'],'coverage.'+source);
    if(!c || !['complete','partial','missing'].includes(c.status) || (c.through!==null&&!validDay(c.through)) || typeof c.note!=='string' || c.note.length>240) throw new Error('Invalid coverage: '+source);
  }
  if(JSON.stringify(Object.keys(data.metrics).sort())!==JSON.stringify(metricKeys.slice().sort())) throw new Error('Unexpected metric fields');
  for(const [key,value] of Object.entries(data.metrics)) if(value!==null && (!Number.isFinite(value)||value<0)) throw new Error('Invalid metric: '+key);
  for(const row of data.content) {
    exact(row,['id','channel','human_hours','effective_visits'],'content row');
    if(!/^[a-z0-9-]+$/.test(row.id||'') || !['site','x','youtube','community'].includes(row.channel) || !Number.isFinite(row.human_hours) || row.human_hours<0 || row.effective_visits!==null&&(!Number.isFinite(row.effective_visits)||row.effective_visits<0)) throw new Error('Invalid content result');
  }
  // This schema intentionally has no user, wallet, email, IP, query text or account identifier fields.
  return data;
}
const shown=value=>value===null?'未提供 / missing':String(value);
export function buildWeeklyReport(data) {
  validateWeeklyInput(data);
  const coverage=Object.entries(data.coverage).map(([k,v])=>`| ${k} | ${v.status} | ${v.through??'—'} | ${v.note} |`).join('\n');
  const metrics=metricKeys.map(k=>`| ${k} | ${shown(data.metrics[k])} |`).join('\n');
  const rows=data.content.length?data.content.map(x=>`| ${x.id} | ${x.channel} | ${shown(x.effective_visits)} | ${x.human_hours} |`).join('\n'):'| — | — | — | — |';
  const comparable=data.content.filter(x=>x.effective_visits!==null&&x.human_hours>0&&x.effective_visits>=30).map(x=>({...x,visits_per_hour:x.effective_visits/x.human_hours})).sort((a,b)=>b.visits_per_hour-a.visits_per_hour);
  const recommendation=comparable.length>=2?`仅供下周排序参考：${comparable.slice(0,2).map(x=>x.id).join('、')}。样本门槛不是统计显著性。`:'数据不足，维持当前低频节奏，不自动增加发帖量。';
  return `# FeeEye 运营周报\n\n观察窗口：${data.window.from} 至 ${data.window.to}\n\n## 数据覆盖\n\n| 来源 | 状态 | 截止 | 说明 |\n|---|---|---|---|\n${coverage}\n\n## 聚合指标\n\n| 指标 | 值 |\n|---|---|\n${metrics}\n\n## 内容效率\n\n| 内容 | 渠道 | 有效访问/结果 | 人工小时 |\n|---|---|---:|---:|\n${rows}\n\n## 结论\n\n${recommendation}\n\n未知值保持“未提供”，不按0处理；不同平台数据不拼成个人画像或确定归因漏斗。\n`;
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), input=args[args.indexOf('--input')+1];
  if(!input) throw new Error('Usage: --input FILE [--out FILE.md]');
  const report=buildWeeklyReport(readJson(input)), out=args.indexOf('--out');
  if(out>=0) {
    const target=path.resolve(args[out+1]), allowed=path.resolve(root,'ops/automation/reports/private')+path.sep;
    if(!target.startsWith(allowed)||path.extname(target)!=='.md'||fs.existsSync(target)) throw new Error('Report output must be a new Markdown file inside private reports');
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,report,{flag:'wx'});
  }
  console.log(report);
}
