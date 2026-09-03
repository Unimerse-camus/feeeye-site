#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decryptPrivateJson, encryptPrivateJson, privateDataKey, readEncryptedJson, writeEncryptedJson } from './private_data_crypto.mjs';

const key=Buffer.alloc(32,7),value={private_metric:42,pages:[{url:'https://feeeye.com/learn/',impressions:10}]},envelope=encryptPrivateJson(value,key);assert.equal(envelope.algorithm,'aes-256-gcm');assert.equal(JSON.stringify(envelope).includes('private_metric'),false);assert.deepEqual(decryptPrivateJson(envelope,key),value);assert.throws(()=>decryptPrivateJson(envelope,Buffer.alloc(32,8)),/authentication failed/);assert.throws(()=>privateDataKey({}),/Missing/);assert.deepEqual(privateDataKey({FEEEYE_OPS_DATA_KEY:key.toString('base64')}),key);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'feeeye-private-')),file=path.join(dir,'record.json.enc');assert.equal(writeEncryptedJson(file,value,key).created,true);assert.equal(writeEncryptedJson(file,value,key).created,false);assert.deepEqual(readEncryptedJson(file,key),value);assert.throws(()=>writeEncryptedJson(file,{private_metric:43},key),/different immutable content/);
console.log('[OK] Private operations data: AES-256-GCM authentication, no plaintext fields, exact 32-byte key, append-only idempotence, wrong-key rejection, and conflict rejection.');
