#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const endpoints=[
  {path:'/',contains:'FeeEye'},
  {path:'/learn/',contains:'Beginner'},
  {path:'/zh/learn/',contains:'新手'},
  {path:'/tools/total-cost-calculator.html',contains:'cost'},
  {path:'/sitemap.xml',contains:'<urlset'},
  {path:'/robots.txt',contains:'Sitemap:'},
  {path:'/release.json',contains:'build_id'}
];
export async function healthCheck({baseUrl,fetchImpl=fetch,checkedAt=new Date().toISOString()}) {
  const base=new URL(baseUrl);
  if(!['https:','http:'].includes(base.protocol) || (base.protocol==='http:'&&!['localhost','127.0.0.1'].includes(base.hostname))) throw new Error('Health check requires HTTPS or local HTTP');
  if(!validInstant(checkedAt)) throw new Error('Invalid check time');
  const results=[];
  for(const item of endpoints) {
    try {
      const start=Date.now(), response=await fetchImpl(new URL(item.path,base),{redirect:'follow'}), body=await response.text();
      results.push({path:item.path,status:response.status,ok:response.ok&&body.includes(item.contains),elapsed_ms:Math.max(0,Date.now()-start)});
    } catch(error) {results.push({path:item.path,status:null,ok:false,error:error.name||'Error'});}
  }
  const failed=results.filter(x=>!x.ok);
  return {schema_version:1,base_url:base.origin,checked_at:checkedAt,status:failed.length?'failed':'healthy',failed_count:failed.length,results};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), baseUrl=args[args.indexOf('--base-url')+1];
  if(!baseUrl) throw new Error('Usage: --base-url URL [--out FILE]');
  const result=await healthCheck({baseUrl}), out=args.indexOf('--out');
  if(out>=0) writeNewJson(args[out+1],result,path.join(root,'ops/automation/reports/private'));
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='healthy') process.exitCode=2;
}
