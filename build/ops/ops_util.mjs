import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const stable = value => {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
};
export const readJson = file => JSON.parse(fs.readFileSync(file,'utf8'));
export const validDay = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
export const validInstant = value => typeof value==='string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString()===value;
export function writeNewJson(file,value,allowedRoot) {
  const target=path.resolve(file), root=path.resolve(allowedRoot)+path.sep;
  if(!target.startsWith(root) || path.extname(target)!=='.json') throw new Error('Output must be a new JSON file inside the working directory');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
}
export function canonicalHtmlMap(dist) {
  const out={};
  const walk=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const file=path.join(dir,entry.name);
      if(entry.isDirectory()) walk(file);
      else if(entry.name.endsWith('.html')) {
        const body=fs.readFileSync(file);
        const match=body.toString('utf8').match(/<link rel="canonical" href="(https:\/\/feeeye\.com\/[^"<]*)">/);
        if(!match) continue;
        if(out[match[1]]) throw new Error('Duplicate canonical: '+match[1]);
        out[match[1]]={path:path.relative(dist,file),sha256:sha256(body)};
      }
    }
  };
  walk(dist);
  return Object.fromEntries(Object.entries(out).sort(([a],[b])=>a.localeCompare(b)));
}
