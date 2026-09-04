#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CLOUDFLARE_GRAPHQL='https://api.cloudflare.com/client/v4/graphql';
export const FEEEYE_CLOUDFLARE_ACCOUNT_ID='26ffda22db1ef2f058448b0c1a94b742';
export const FEEEYE_CLOUDFLARE_SITE_TAG='3830f248a2784b5191fef3f9cc4e84f4';
const ALLOWED_DATASETS=['rumPageloadEventsAdaptiveGroups','rumPerformanceEventsAdaptiveGroups','rumWebVitalsEventsAdaptiveGroups'];

export function cloudflareProbeCredentials(env=process.env) {
  const token=env.FEEEYE_CLOUDFLARE_ANALYTICS_TOKEN;
  if(!token||!/^cfat_[A-Za-z0-9_-]{40,80}$/.test(token))throw new Error('Missing or invalid Cloudflare analytics token');
  return{token};
}

const unwrap=type=>{let current=type;while(current?.ofType)current=current.ofType;return current?.name||null;};
const typeRef=`kind name ofType { kind name ofType { kind name ofType { kind name } } }`;

async function query(token,body,fetchImpl) {
  const response=await fetchImpl(CLOUDFLARE_GRAPHQL,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','User-Agent':'FeeEye-Cloudflare-Probe/1.0'},body:JSON.stringify(body),signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw new Error(`Cloudflare GraphQL probe failed (HTTP ${response.status})`);
  const json=await response.json();
  if(json.errors?.length)throw new Error('Cloudflare GraphQL schema probe returned errors');
  return json.data;
}

export async function probeCloudflareAnalytics({token,fetchImpl=fetch,observedAt=new Date().toISOString()}={}) {
  if(!token)throw new Error('Cloudflare analytics token is required');
  const account=await query(token,{query:`query FeeEyeAccountSchema { __type(name: "Account") { fields(includeDeprecated: true) { name type { ${typeRef} } args { name type { ${typeRef} } } } } }`},fetchImpl);
  const fields=account?.__type?.fields;
  if(!Array.isArray(fields))throw new Error('Cloudflare Account GraphQL type is unavailable');
  const datasets=fields.filter(field=>ALLOWED_DATASETS.includes(field.name)).map(field=>({name:field.name,result_type:unwrap(field.type),arguments:(field.args||[]).map(arg=>arg.name).sort()})).sort((a,b)=>a.name.localeCompare(b.name));
  const types=[];
  for(const name of [...new Set(datasets.map(item=>item.result_type).filter(Boolean))]){
    const data=await query(token,{query:`query FeeEyeDatasetSchema { __type(name: "${name}") { fields(includeDeprecated: true) { name type { ${typeRef} } } } }`},fetchImpl);
    types.push({name,fields:(data?.__type?.fields||[]).map(field=>({name:field.name,type:unwrap(field.type)})).sort((a,b)=>a.name.localeCompare(b.name))});
  }
  return{schema_version:1,observed_at:observedAt,account_bound:FEEEYE_CLOUDFLARE_ACCOUNT_ID,site_tag_bound:FEEEYE_CLOUDFLARE_SITE_TAG,hostname_bound:'feeeye.com',permission_required:'Account Analytics Read',probe_kind:'schema_only',data_rows_read:0,datasets,types};
}

export function cloudflareProbeSummary(result) {
  return{schema_version:result.schema_version,observed_at:result.observed_at,probe_kind:result.probe_kind,data_rows_read:result.data_rows_read,dataset_names:result.datasets.map(item=>item.name),dataset_count:result.datasets.length,type_count:result.types.length,private_details_logged:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),index=args.indexOf('--out'),out=index>=0?args[index+1]:null;if(!out)throw new Error('Usage: --out FILE');
  const result=await probeCloudflareAnalytics(cloudflareProbeCredentials());
  const target=path.resolve(out);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(cloudflareProbeSummary(result)));
}
