#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stable } from './ops/ops_util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemapPath = path.join(root, 'dist', 'sitemap.xml');
const keyPath = path.join(root, 'assets', 'indexnow-key.txt');
const host = 'feeeye.com';
const endpoint = 'https://api.indexnow.org/indexnow';
const hash = value => createHash('sha256').update(value).digest('hex');
const argValue = (args,name) => { const i=args.indexOf(name); return i<0?null:args[i+1]; };

export function validateDeltaSubmission(delta,verification,key) {
  if(delta?.schema_version!==1 || !/^[a-f0-9]{64}$/.test(delta.build_id||'') || !['ready','no_changes'].includes(delta.status) || delta.submitted!==false) throw new Error('Invalid IndexNow delta artifact');
  if(verification?.schema_version!==1 || verification.status!=='verified' || verification.build_id!==delta.build_id || !Array.isArray(verification.checks) || verification.checks.some(x=>x.ok!==true)) throw new Error('Matching successful deployment verification is required');
  const payload=delta.payload;
  if(!payload || payload.host!==host || payload.key!==key || payload.keyLocation!==`https://${host}/${key}.txt` || !Array.isArray(payload.urlList) || payload.urlList.length>10000 || new Set(payload.urlList).size!==payload.urlList.length) throw new Error('Invalid IndexNow payload');
  for(const value of payload.urlList) {const url=new URL(value);if(url.protocol!=='https:'||url.hostname!==host) throw new Error('Unexpected IndexNow URL');}
  if(delta.payload_hash!==hash(stable({host:payload.host,key:payload.key,keyLocation:payload.keyLocation,urlList:payload.urlList}))) {
    // Older/manual serializers are intentionally rejected; regenerate the delta with the current code.
    throw new Error('IndexNow payload hash mismatch');
  }
  return payload;
}

export async function run(args=process.argv.slice(2),fetchImpl=fetch,now=()=>new Date().toISOString()) {
  if (!fs.existsSync(sitemapPath)) throw new Error('dist/sitemap.xml is missing; run build/generate.mjs first');
  if (!fs.existsSync(keyPath)) throw new Error('assets/indexnow-key.txt is missing');
  const key=fs.readFileSync(keyPath,'utf8').trim();
  if(!/^[a-f0-9]{8,128}$/i.test(key)) throw new Error('IndexNow key must be 8-128 hexadecimal characters');
  const generatedKeyPath=path.join(root,'dist',`${key}.txt`);
  if(!fs.existsSync(generatedKeyPath)||fs.readFileSync(generatedKeyPath,'utf8').trim()!==key) throw new Error('Generated root verification file is missing or invalid');

  if(!args.includes('--submit')) {
    if(args.length) throw new Error('Dry run takes no arguments; submission requires the full gated argument set');
    const xml=fs.readFileSync(sitemapPath,'utf8');
    const urls=[...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map(m=>m[1]);
    if(!urls.length||urls.length>10000) throw new Error('Invalid sitemap URL count');
    for(const value of urls) {const url=new URL(value);if(url.protocol!=='https:'||url.hostname!==host) throw new Error('Unexpected sitemap URL');}
    return {mode:'dry_run',message:`[OK] IndexNow dry run: ${urls.length} canonical URLs, keyLocation=https://${host}/${key}.txt`};
  }

  const allowed=['--submit','--delta-file','--verification','--receipt-out'];
  for(let i=0;i<args.length;i++) {
    if(!allowed.includes(args[i])) throw new Error('Unknown submission argument: '+args[i]);
    if(args[i]!=='--submit') i++;
  }
  const deltaPath=argValue(args,'--delta-file'), verificationPath=argValue(args,'--verification'), receiptPath=argValue(args,'--receipt-out');
  if(!deltaPath||!verificationPath||!receiptPath) throw new Error('--submit requires --delta-file, --verification and --receipt-out');
  const target=path.resolve(receiptPath), allowedRoot=path.resolve(root,'ops/automation/working')+path.sep;
  if(!target.startsWith(allowedRoot)||path.extname(target)!=='.json'||fs.existsSync(target)) throw new Error('Receipt must be a new JSON file inside ops/automation/working');
  const delta=JSON.parse(fs.readFileSync(deltaPath)), verification=JSON.parse(fs.readFileSync(verificationPath));
  const payload=validateDeltaSubmission(delta,verification,key);
  if(!payload.urlList.length) return {mode:'no_changes',message:'[OK] IndexNow delta is empty; nothing submitted.'};

  // Reconcile the live release again immediately before the external submission.
  const releaseResponse=await fetchImpl('https://feeeye.com/release.json',{headers:{accept:'application/json'}});
  if(!releaseResponse.ok) throw new Error('Live release verification failed: HTTP '+releaseResponse.status);
  const release=await releaseResponse.json();
  if(release.build_id!==delta.build_id) throw new Error('Live build changed after verification; regenerate the delta');

  const response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify(payload)});
  const responseBody=await response.text();
  if(![200,202].includes(response.status)) throw new Error(`IndexNow submission failed (${response.status}): ${responseBody.slice(0,200)}`);
  const receipt={schema_version:1,build_id:delta.build_id,payload_hash:delta.payload_hash,url_count:payload.urlList.length,http_status:response.status,submitted_at:now(),status:'accepted_not_indexed'};
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  return {mode:'submitted',receipt,message:`[OK] IndexNow accepted ${payload.urlList.length} changed URLs (HTTP ${response.status}); acceptance is not indexing.`};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const result=await run();
  console.log(result.message);
}
