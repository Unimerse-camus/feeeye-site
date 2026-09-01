#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const critical=['/','/learn/','/learn/crypto-total-cost','/learn/safe-crypto-transfer','/tools/total-cost-calculator.html','/zh/learn/'];
export async function verifyDeployment({baseUrl,manifest,fetchImpl=fetch,checkedAt=new Date().toISOString()}) {
  const base=new URL(baseUrl);
  if(!['https:','http:'].includes(base.protocol) || (base.protocol==='http:' && !['127.0.0.1','localhost'].includes(base.hostname))) throw new Error('Verification requires HTTPS or local HTTP');
  if(!validInstant(checkedAt)) throw new Error('Invalid check time');
  const releaseResponse=await fetchImpl(new URL('/release.json',base));
  if(!releaseResponse.ok) throw new Error('release.json HTTP '+releaseResponse.status);
  const release=await releaseResponse.json();
  if(release.build_id!==manifest.build_id || release.canonical_url_count!==manifest.canonical_url_count || release.public_file_count!==manifest.public_file_count) throw new Error('Deployed build does not match candidate manifest');
  if(manifest.source_revision && release.source_revision!==manifest.source_revision) throw new Error('Deployed source revision does not match candidate');
  const checks=[];
  for(const pathname of critical) {
    const response=await fetchImpl(new URL(pathname,base),{redirect:'follow'});
    const type=response.headers.get('content-type')||'';
    const body=await response.text();
    const ok=response.ok && type.includes('text/html') && body.includes('FeeEye') && !/>undefined<|>NaN<|null×/.test(body);
    checks.push({pathname,status:response.status,ok});
    if(!ok) throw new Error('Critical deployment check failed: '+pathname);
  }
  return {schema_version:1,base_url:base.origin,build_id:manifest.build_id,source_revision:manifest.source_revision??null,checked_at:checkedAt,status:'verified',checks};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), baseUrl=args[args.indexOf('--base-url')+1], manifestPath=args[args.indexOf('--manifest')+1];
  if(!baseUrl || !manifestPath) throw new Error('Usage: --base-url URL --manifest FILE [--out FILE]');
  const raw=readJson(manifestPath), manifest=raw.manifest||raw;
  const receipt=await verifyDeployment({baseUrl,manifest});
  const out=args.indexOf('--out');
  if(out>=0) writeNewJson(args[out+1],receipt,path.join(root,'ops/automation/working'));
  console.log(JSON.stringify(receipt,null,2));
}
