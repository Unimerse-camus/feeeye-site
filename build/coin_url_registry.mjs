import fs from 'node:fs';

const DAY_RE=/^\d{4}-\d{2}-\d{2}$/;
const SYMBOL_RE=/^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error('Unexpected fields: '+label);};

export function coinUrlSlug(symbol) {
  const value=String(symbol||'').trim().toUpperCase();
  if(!SYMBOL_RE.test(value))throw new Error('Invalid coin URL symbol');
  return value.toLowerCase();
}

export function validateCoinUrlRegistry(registry) {
  exact(registry,['schema_version','updated_at','coins'],'coin URL registry');
  if(registry.schema_version!==1||!DAY_RE.test(registry.updated_at)||!Array.isArray(registry.coins))throw new Error('Invalid coin URL registry');
  const seen=new Set();
  for(const coin of registry.coins){
    exact(coin,['symbol','name','cg_id','last_seen'],'coin URL entry');
    const slug=coinUrlSlug(coin.symbol);
    if(seen.has(slug)||typeof coin.name!=='string'||!coin.name.trim()||typeof coin.cg_id!=='string'||!DAY_RE.test(coin.last_seen))throw new Error('Invalid or duplicate coin URL entry');
    seen.add(slug);
  }
  return registry;
}

export function loadCoinUrlRegistry(file) {
  if(!fs.existsSync(file))return{schema_version:1,updated_at:'1970-01-01',coins:[]};
  return validateCoinUrlRegistry(JSON.parse(fs.readFileSync(file,'utf8')));
}

export function mergeCoinUrlRegistry(registry,previousCoins,nextCoins,updatedAt) {
  validateCoinUrlRegistry(registry);
  if(!DAY_RE.test(updatedAt)||!Array.isArray(previousCoins)||!Array.isArray(nextCoins))throw new Error('Invalid coin URL registry update');
  const entries=new Map(registry.coins.map(coin=>[coinUrlSlug(coin.symbol),{...coin}]));
  for(const coin of [...previousCoins,...nextCoins]){
    let slug;try{slug=coinUrlSlug(coin.symbol);}catch{continue;}
    const lastSeen=DAY_RE.test(coin.last_updated||'')?coin.last_updated:updatedAt;
    const old=entries.get(slug);
    entries.set(slug,{symbol:String(coin.symbol).toUpperCase(),name:String(coin.name||coin.symbol),cg_id:String(coin.cg_id||''),last_seen:old&&old.last_seen>lastSeen?old.last_seen:lastSeen});
  }
  return validateCoinUrlRegistry({schema_version:1,updated_at:updatedAt,coins:[...entries.values()].sort((a,b)=>coinUrlSlug(a.symbol).localeCompare(coinUrlSlug(b.symbol)))});
}
