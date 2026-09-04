#!/usr/bin/env node
// Offline checks only; never fetch, commit, push, submit URLs or publish.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
for(const script of ['build/audit_exchange_data.mjs','build/test_exchange_quotes.mjs','build/generate.mjs','build/ops/seo_geo_audit.mjs','build/test_analytics_contract.mjs','build/ops/test_source_review.mjs','build/ops/test_launch_campaign.mjs','build/ops/test_operations.mjs','build/ops/test_workflow_phase3.mjs','build/ops/test_channel_policy.mjs','build/ops/test_distribution_plan.mjs','build/ops/test_editorial_pipeline.mjs','build/ops/test_page_opportunity_queue.mjs','build/ops/test_home_snippet_experiment.mjs','build/ops/test_bilingual_self_check.mjs','build/ops/test_autonomous_operations.mjs','build/ops/test_x_connection_check.mjs','build/ops/test_x_publish_executor.mjs','build/ops/test_x_preflight_receipts.mjs','build/ops/test_x_live_trial_workflow.mjs','build/ops/test_private_data_crypto.mjs','build/ops/test_x_metrics_collector.mjs','build/ops/test_x_metrics_analysis.mjs','build/ops/test_gsc_page_signals.mjs','build/ops/test_cloudflare_analytics_probe.mjs','build/submit_indexnow.mjs']) {
  execFileSync(process.execPath,[script],{cwd,stdio:'inherit'});
}
console.log('[OK] Local validation complete. IndexNow was dry-run only. No deployment or posting.');
