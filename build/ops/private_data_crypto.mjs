#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256, stable } from './ops_util.mjs';

const FIELDS=['schema_version','algorithm','iv','tag','ciphertext','content_sha256'];
const AAD=Buffer.from('feeeye-private-operations-v1');
const exact=(value,keys)=>value&&JSON.stringify(Object.keys(value).sort())===JSON.stringify(keys.slice().sort());

export function privateDataKey(env=process.env) {
  const encoded=env.FEEEYE_OPS_DATA_KEY;if(!encoded)throw new Error('Missing FEEEYE_OPS_DATA_KEY');
  const key=Buffer.from(encoded,'base64');if(key.length!==32||key.toString('base64').replace(/=+$/,'')!==encoded.replace(/=+$/,''))throw new Error('FEEEYE_OPS_DATA_KEY must be a base64-encoded 32-byte key');return key;
}

export function encryptPrivateJson(value,key) {
  if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('Private data key must contain 32 bytes');
  const plaintext=Buffer.from(stable(value)),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(AAD);const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]),tag=cipher.getAuthTag();
  return{schema_version:1,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:tag.toString('base64'),ciphertext:ciphertext.toString('base64'),content_sha256:sha256(plaintext)};
}

export function decryptPrivateJson(envelope,key) {
  if(!exact(envelope,FIELDS)||envelope.schema_version!==1||envelope.algorithm!=='aes-256-gcm'||!/^[a-f0-9]{64}$/.test(envelope.content_sha256||''))throw new Error('Invalid private data envelope');
  try{const iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64'),ciphertext=Buffer.from(envelope.ciphertext,'base64');if(iv.length!==12||tag.length!==16)throw new Error();const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(AAD);decipher.setAuthTag(tag);const plaintext=Buffer.concat([decipher.update(ciphertext),decipher.final()]);if(sha256(plaintext)!==envelope.content_sha256)throw new Error();return JSON.parse(plaintext.toString('utf8'));}catch{throw new Error('Private data authentication failed');}
}

export function writeEncryptedJson(file,value,key) {
  const target=path.resolve(file);fs.mkdirSync(path.dirname(target),{recursive:true});
  if(fs.existsSync(target)){const existing=decryptPrivateJson(JSON.parse(fs.readFileSync(target,'utf8')),key);if(stable(existing)!==stable(value))throw new Error('Encrypted record already exists with different immutable content');return{created:false,file:target};}
  fs.writeFileSync(target,JSON.stringify(encryptPrivateJson(value,key),null,2)+'\n',{flag:'wx',mode:0o600});return{created:true,file:target};
}

export function readEncryptedJson(file,key) {return decryptPrivateJson(JSON.parse(fs.readFileSync(file,'utf8')),key);}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),value=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:null;},input=value('--input'),out=value('--out');if(!args.includes('--encrypt')||!input||!out)throw new Error('Usage: --encrypt --input FILE --out FILE');writeEncryptedJson(out,JSON.parse(fs.readFileSync(input,'utf8')),privateDataKey());console.log(JSON.stringify({encrypted:true,file:path.basename(out)}));}
