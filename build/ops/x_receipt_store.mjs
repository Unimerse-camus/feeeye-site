#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJson, stable, validInstant } from './ops_util.mjs';

const RECEIPT_FIELDS=['schema_version','request_id','idempotency_key','account','post_url','reconciled','post_created','recorded_at'];
const exact=(value,keys,label)=>{if(!value||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.slice().sort()))throw new Error(`Unexpected fields: ${label}`);};

export function validateXReceipt(receipt,request) {
  exact(receipt,RECEIPT_FIELDS,'X receipt');
  if(receipt.schema_version!==1||receipt.request_id!==request.request_id||receipt.idempotency_key!==request.gates.idempotency_key||receipt.account!=='@FeeEyeOfficial'||!/^https:\/\/x\.com\/FeeEyeOfficial\/status\/[0-9]+$/.test(receipt.post_url||'')||typeof receipt.reconciled!=='boolean'||typeof receipt.post_created!=='boolean'||receipt.reconciled===receipt.post_created||!validInstant(receipt.recorded_at)||Date.parse(receipt.recorded_at)<Date.parse(request.not_before))throw new Error('Invalid or mismatched X receipt');
  return receipt;
}

export function receiptPath(storeRoot,idempotencyKey) {
  if(!/^[a-f0-9]{64}$/.test(idempotencyKey||''))throw new Error('Invalid receipt idempotency key');
  return path.join(path.resolve(storeRoot),'x',`${idempotencyKey}.json`);
}

export function recordXReceipt(storeRoot,receipt,request) {
  validateXReceipt(receipt,request);
  const file=receiptPath(storeRoot,receipt.idempotency_key);fs.mkdirSync(path.dirname(file),{recursive:true});
  const body=JSON.stringify(receipt,null,2)+'\n';
  try{fs.writeFileSync(file,body,{flag:'wx',mode:0o600});return{created:true,file};}
  catch(error){if(error.code!=='EEXIST')throw error;const existing=readJson(file);if(stable(existing)!==stable(receipt))throw new Error('Receipt key already exists with different immutable content');return{created:false,file};}
}

export function loadXReceipt(storeRoot,idempotencyKey) {
  const file=receiptPath(storeRoot,idempotencyKey);return fs.existsSync(file)?readJson(file):null;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),value=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:null;},store=value('--store'),requestFile=value('--request'),receiptFile=value('--receipt');
  if(!store||!requestFile||!receiptFile)throw new Error('Usage: --store DIR --request FILE --receipt FILE');
  const result=recordXReceipt(store,readJson(receiptFile),readJson(requestFile));console.log(JSON.stringify({created:result.created,file:path.relative(path.resolve(store),result.file)}));
}
