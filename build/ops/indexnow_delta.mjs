#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, sha256, stable, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export function buildDeltaPayload(candidate,verification) {
  if(verification.status!=='verified' || verification.build_id!==candidate.manifest.build_id) throw new Error('Matching deployment verification is required');
  const urls=candidate.delta.url_list;
  if(!Array.isArray(urls) || urls.length>10000 || new Set(urls).size!==urls.length) throw new Error('Invalid delta URL list');
  for(const value of urls) {const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='feeeye.com') throw new Error('Unexpected IndexNow URL');}
  const key=fs.readFileSync(path.join(root,'assets/indexnow-key.txt'),'utf8').trim();
  const payload={host:'feeeye.com',key,keyLocation:`https://feeeye.com/${key}.txt`,urlList:urls};
  return {schema_version:1,build_id:candidate.manifest.build_id,verification_checked_at:verification.checked_at,delta:candidate.delta,payload,payload_hash:sha256(stable(payload)),status:urls.length?'ready':'no_changes',submitted:false};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), candidate=readJson(args[args.indexOf('--candidate')+1]), verification=readJson(args[args.indexOf('--verification')+1]);
  if(!candidate||!verification) throw new Error('Usage: --candidate FILE --verification FILE [--out FILE]');
  const result=buildDeltaPayload(candidate,verification), out=args.indexOf('--out');
  if(out>=0) writeNewJson(args[out+1],result,path.join(root,'ops/automation/working'));
  console.log(JSON.stringify(result,null,2));
}
