#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflareProbeCredentials, cloudflareProbeSummary, probeCloudflareAnalytics } from './cloudflare_analytics_probe.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),workflow=fs.readFileSync(path.join(root,'.github/workflows/cloudflare-analytics-probe.yml'),'utf8');
assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/\bschedule:/);assert.match(workflow,/contents: read/);assert.doesNotMatch(workflow,/contents: write|git push|automation-receipts/);assert.match(workflow,/FEEEYE_CLOUDFLARE_ANALYTICS_TOKEN/);
assert.throws(()=>cloudflareProbeCredentials({}),/Missing or invalid/);assert.throws(()=>cloudflareProbeCredentials({FEEEYE_CLOUDFLARE_ANALYTICS_TOKEN:'bad'}),/Missing or invalid/);
const token='cfat_'+('a'.repeat(48)),calls=[];
const fetchImpl=async(url,options)=>{calls.push({url,options});const body=JSON.parse(options.body),name=(body.query.match(/__type\(name: "([^"]+)"\)/)||[])[1];
  if(body.query.includes('__schema'))return{ok:true,status:200,json:async()=>({data:{__schema:{queryType:{fields:[{name:'viewer',type:{kind:'OBJECT',name:'ViewerRoot',ofType:null}}]}}}})};
  if(name==='ViewerRoot')return{ok:true,status:200,json:async()=>({data:{__type:{fields:[{name:'accounts',type:{kind:'LIST',name:null,ofType:{kind:'OBJECT',name:'AccountNode',ofType:null}},args:[{name:'filter',type:{kind:'INPUT_OBJECT',name:'AccountFilter',ofType:null}}]}]}}})};
  if(name==='AccountNode')return{ok:true,status:200,json:async()=>({data:{__type:{fields:[{name:'rumPageloadEventsAdaptiveGroups',type:{kind:'LIST',name:null,ofType:{kind:'OBJECT',name:'AccountRumPageloadEventsAdaptiveGroups',ofType:null}},args:[{name:'filter',type:{kind:'INPUT_OBJECT',name:'AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject',ofType:null}},{name:'limit',type:{kind:'SCALAR',name:'Int',ofType:null}}]},{name:'billing',type:{kind:'OBJECT',name:'Billing',ofType:null},args:[]}]}}})};
  if(name==='AccountRumPageloadEventsAdaptiveGroups')return{ok:true,status:200,json:async()=>({data:{__type:{fields:[{name:'count',type:{kind:'SCALAR',name:'UInt64',ofType:null},args:[]},{name:'dimensions',type:{kind:'OBJECT',name:'RumDimensions',ofType:null},args:[]},{name:'sum',type:{kind:'OBJECT',name:'RumSum',ofType:null},args:[]}]}}})};
  if(name==='RumDimensions')return{ok:true,status:200,json:async()=>({data:{__type:{fields:[{name:'date',type:{kind:'SCALAR',name:'Date',ofType:null},args:[]},{name:'refererHost',type:{kind:'SCALAR',name:'String',ofType:null},args:[]}]}}})};
  if(name==='RumSum')return{ok:true,status:200,json:async()=>({data:{__type:{fields:[{name:'visits',type:{kind:'SCALAR',name:'UInt64',ofType:null},args:[]}]}}})};
  if(name==='AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject')return{ok:true,status:200,json:async()=>({data:{__type:{inputFields:[{name:'datetime_geq',type:{kind:'SCALAR',name:'Time',ofType:null}},{name:'datetime_leq',type:{kind:'SCALAR',name:'Time',ofType:null}},{name:'siteTag',type:{kind:'SCALAR',name:'String',ofType:null}}]}}})};
  throw new Error('Unexpected mock type '+name);};
const result=await probeCloudflareAnalytics({token,fetchImpl,observedAt:'2026-09-04T04:00:00.000Z'});assert.equal(calls.length,7);assert.equal(calls[0].url,'https://api.cloudflare.com/client/v4/graphql');assert.equal(calls[0].options.headers.Authorization,`Bearer ${token}`);assert.deepEqual(result.datasets.map(x=>x.name),['rumPageloadEventsAdaptiveGroups']);assert.equal(result.datasets[0].arguments[0].name,'filter');assert.deepEqual(result.nested.map(x=>x.name),['RumDimensions','RumSum']);assert.deepEqual(result.inputs[0].fields.map(x=>x.name),['datetime_geq','datetime_leq','siteTag']);assert.equal(result.data_rows_read,0);assert.equal(result.probe_kind,'schema_only');const summary=cloudflareProbeSummary(result);assert.equal(summary.private_details_logged,false);assert.doesNotMatch(JSON.stringify(summary),/cfat_|feeeye\.com|site_tag_bound|account_bound/);
console.log('[OK] Cloudflare analytics probe: exact read-only secret, schema-only RUM discovery, no schedule, no repository writes, zero analytics rows, and safe logs.');
