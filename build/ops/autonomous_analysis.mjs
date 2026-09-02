#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson, validDay, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};
export function analyzeAutonomousResults(data) {
  exact(data,['schema_version','window','items'],'root');exact(data.window,['from','to'],'window');if(data.schema_version!==1||!validDay(data.window.from)||!validDay(data.window.to)||(Date.parse(data.window.to)-Date.parse(data.window.from))/86400000!==27||!Array.isArray(data.items))throw new Error('Invalid autonomous analysis window');
  const ids=new Set(),decisions=[];
  for(const item of data.items){exact(item,['id','channel','age_days','effective_visits','human_hours','rule_violations','publish_errors','source_current','bilingual_verified','consecutive_qualified_windows'],'item');if(!/^[a-z0-9-]+$/.test(item.id||'')||ids.has(item.id)||!['site','x','youtube','community'].includes(item.channel)||!Number.isSafeInteger(item.age_days)||item.age_days<0||item.age_days>365||item.effective_visits!==null&&(!Number.isFinite(item.effective_visits)||item.effective_visits<0)||!Number.isFinite(item.human_hours)||item.human_hours<0||!Number.isSafeInteger(item.rule_violations)||item.rule_violations<0||!Number.isSafeInteger(item.publish_errors)||item.publish_errors<0||typeof item.source_current!=='boolean'||typeof item.bilingual_verified!=='boolean'||!Number.isSafeInteger(item.consecutive_qualified_windows)||item.consecutive_qualified_windows<0)throw new Error('Invalid autonomous result');ids.add(item.id);
    let decision='observe',multiplier=1,reason='observation_window_open';if(item.rule_violations||item.publish_errors||!item.source_current||!item.bilingual_verified){decision='stop';multiplier=0;reason='safety_or_integrity_failure';}else if(item.age_days>=28&&(item.effective_visits===null||item.effective_visits<30)){decision='hold';multiplier=.5;reason='insufficient_effective_visits';}else if(item.age_days>=28&&item.effective_visits>=30&&item.consecutive_qualified_windows>=2){decision='scale';multiplier=1.25;reason='two_qualified_windows';}else if(item.age_days>=28&&item.effective_visits>=30){decision='maintain';reason='first_qualified_window';}
    decisions.push({id:item.id,channel:item.channel,decision,next_cadence_multiplier:multiplier,reason,automatic:true});
  }
  return{schema_version:1,window:data.window,status:'complete',automatic_decision:true,max_scale_multiplier:1.25,decisions};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),input=args[args.indexOf('--input')+1];if(!input)throw new Error('Usage: --input FILE [--out FILE]');const result=analyzeAutonomousResults(readJson(input)),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],result,path.join(root,'ops/automation/working'));console.log(JSON.stringify(result,null,2));}
