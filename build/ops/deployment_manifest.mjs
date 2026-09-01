#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalHtmlMap, readJson, sha256, stable, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export function buildManifest(dist=path.join(root,'dist')) {
  const release=readJson(path.join(dist,'release.json'));
  const urls=canonicalHtmlMap(dist);
  if(Object.keys(urls).length!==release.canonical_url_count) throw new Error('Release URL count mismatch');
  const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'));
  if(!Number.isSafeInteger(release.public_file_count)||release.public_file_count<Object.keys(urls).length) throw new Error('Invalid release file coverage');
  const manifest={schema_version:1,host:'feeeye.com',build_id:release.build_id,source_revision:release.source_revision??null,canonical_url_count:release.canonical_url_count,public_file_count:release.public_file_count,sitemap_sha256:sha256(sitemap),urls};
  manifest.manifest_hash=sha256(stable(manifest));
  return manifest;
}
export function delta(current,previous=null) {
  if(!previous) return {from_build:null,to_build:current.build_id,created:Object.keys(current.urls),changed:[],deleted:[],url_list:Object.keys(current.urls)};
  if(previous.host!==current.host || previous.build_id===current.build_id) {
    if(previous.build_id===current.build_id) return {from_build:previous.build_id,to_build:current.build_id,created:[],changed:[],deleted:[],url_list:[]};
    throw new Error('Manifest host mismatch');
  }
  const created=[],changed=[],deleted=[];
  for(const [url,meta] of Object.entries(current.urls)) (!previous.urls[url]?created:previous.urls[url].sha256!==meta.sha256?changed:null)?.push?.(url);
  for(const url of Object.keys(previous.urls)) if(!current.urls[url]) deleted.push(url);
  const url_list=[...created,...changed,...deleted].sort();
  return {from_build:previous.build_id,to_build:current.build_id,created:created.sort(),changed:changed.sort(),deleted:deleted.sort(),url_list};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), manifest=buildManifest();
  const previousIndex=args.indexOf('--previous'), previous=previousIndex>=0?readJson(args[previousIndex+1]):null;
  const result={manifest,delta:delta(manifest,previous)};
  const outIndex=args.indexOf('--out');
  if(outIndex>=0) writeNewJson(args[outIndex+1],result,path.join(root,'ops/automation/working'));
  console.log(JSON.stringify(args.includes('--quiet')?{build_id:manifest.build_id,source_revision:manifest.source_revision,canonical_url_count:manifest.canonical_url_count,public_file_count:manifest.public_file_count,delta_counts:{created:result.delta.created.length,changed:result.delta.changed.length,deleted:result.delta.deleted.length}}:result,null,2));
}
