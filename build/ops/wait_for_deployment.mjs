#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export async function waitForDeployment({baseUrl,expectedRevision,expectedBuildId,attempts=30,delayMs=10000,fetchImpl=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),checkedAt=()=>new Date().toISOString()}) {
  const base=new URL(baseUrl);
  if(base.protocol!=='https:'||!/^[a-f0-9]{40}$/.test(expectedRevision||'')||!/^[a-f0-9]{64}$/.test(expectedBuildId||'')||!Number.isSafeInteger(attempts)||attempts<1||attempts>60||!Number.isSafeInteger(delayMs)||delayMs<0||delayMs>60000)throw new Error('Invalid deployment wait configuration');
  for(let attempt=1;attempt<=attempts;attempt++){
    try{const response=await fetchImpl(new URL('/release.json',base),{headers:{accept:'application/json'}});if(response.ok){const release=await response.json();if(release.source_revision===expectedRevision&&release.build_id===expectedBuildId){const at=checkedAt();if(!validInstant(at))throw new Error('Invalid deployment receipt time');return{schema_version:1,status:'matched',base_url:base.origin,source_revision:release.source_revision,build_id:release.build_id,canonical_url_count:release.canonical_url_count,public_file_count:release.public_file_count,checked_at:at,attempts_used:attempt};}}}catch(error){if(attempt===attempts)throw error;}
    if(attempt<attempts)await sleep(delayMs);
  }
  throw new Error('Production deployment did not match the expected source and build');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),baseUrl=args[args.indexOf('--base-url')+1],expectedRevision=args[args.indexOf('--expected-revision')+1],candidate=readJson(path.join(root,'dist/release.json')),attemptIndex=args.indexOf('--attempts'),delayIndex=args.indexOf('--delay-ms');if(!baseUrl||!expectedRevision)throw new Error('Usage: --base-url URL --expected-revision SHA [--attempts N] [--delay-ms N] [--out FILE]');const receipt=await waitForDeployment({baseUrl,expectedRevision,expectedBuildId:candidate.build_id,attempts:attemptIndex>=0?Number(args[attemptIndex+1]):30,delayMs:delayIndex>=0?Number(args[delayIndex+1]):10000}),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],receipt,path.join(root,'ops/automation/working'));console.log(JSON.stringify(receipt,null,2));}
