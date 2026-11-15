#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const workflow = fs.readFileSync(path.join(root, '.github/workflows/refresh-automerge.yml'), 'utf8');

// Trigger: chained after the refresh workflow completes (same pattern as x-analysis), plus supervised dispatch.
assert.match(workflow, /workflow_run:\s*\n\s+workflows: \[refresh-coin-data\]\s*\n\s+types: \[completed\]/);
assert.match(workflow, /workflow_dispatch:/);
// Fail-closed gate on the triggering run's conclusion.
assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
// Least permissions needed: merge PRs, push merges, approve pending workflow runs.
assert.match(workflow, /pull-requests: write/);
assert.match(workflow, /actions: write/);
// The whitelist: exactly the three files the refresh workflow itself commits.
assert.ok(workflow.includes('printf \'%s\\n\' data/coin-url-registry.json data/coins.json data/exchanges.js'));
assert.match(workflow, /comm -23/);
assert.match(workflow, /outside the authorized data whitelist; leaving it for human review/);
assert.match(workflow, /empty diff; refusing to merge/);
// Approve → wait for the required check → plain merge, never an admin bypass.
assert.match(workflow, /actions\/runs\/\$RUN_ID\/approve/);
assert.match(workflow, /conclusion == "success"/);
assert.ok(workflow.includes('gh pr merge "${{ steps.pr.outputs.number }}" --merge'));
assert.ok(!workflow.includes('--admin'));
assert.ok(!workflow.includes('git push origin HEAD:main'));
// Skip path when refresh found no changes (no open PR).
assert.match(workflow, /No open refresh PR \(data unchanged\)/);
// No checkout of the ledger or secrets: this workflow never touches private data.
assert.ok(!workflow.includes('FEEEYE_OPS_DATA_KEY'));
assert.ok(!workflow.includes('automation-receipts'));

console.log('[OK] refresh-automerge: chained trigger, success gate, three-file whitelist, check approval, wait-then-merge without admin bypass, and clean no-op path.');
