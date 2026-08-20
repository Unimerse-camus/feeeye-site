#!/usr/bin/env node
// Optional network check for official evidence links. Not part of CI because
// several exchanges rate-limit or block automated requests.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/exchanges.js'), 'utf8'), ctx, { filename: 'exchanges.js' });

const records = Object.entries(ctx.window.EXCHANGES).flatMap(([slug, ex]) =>
  Object.entries(ex.evidence || {}).map(([field, evidence]) => ({ slug, field, url: evidence.url }))
);
let failed = 0;
for (const record of records) {
  try {
    const response = await fetch(record.url, { redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'FeeEye source checker/1.0' } });
    const reachable = response.ok || [401, 403, 405, 429].includes(response.status);
    console.log(`[source] ${reachable ? 'reachable' : 'failed'} ${response.status} ${record.slug}.${record.field} ${record.url}`);
    if (!reachable) failed++;
  } catch (error) {
    failed++;
    console.error(`[source] failed network ${record.slug}.${record.field} ${record.url} ${error.name}`);
  }
}
console.log(`[source] checked=${records.length} failed=${failed}`);
if (failed) process.exitCode = 1;
