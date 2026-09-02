#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEARNING_ARTICLES } from '../learning_content.mjs';
import { buildMultichannelBrief } from './multichannel_brief.mjs';
import { stable, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const urls=brief=>brief.sources.map(x=>x.url).sort();
const lengths=brief=>brief.youtube.storyboard.map(x=>x.grounded_points.length);
const check=(checks,id,condition)=>checks.push({id,ok:Boolean(condition)});
export function compareMultichannelBriefs(en,zh) {
  const checks=[];
  check(checks,'locale_pair',en.locale==='en'&&zh.locale==='zh');
  check(checks,'topic',en.topic_id===zh.topic_id);
  check(checks,'category',en.category===zh.category);
  check(checks,'risk',en.risk===zh.risk);
  check(checks,'draft_state',en.status==='draft'&&zh.status==='draft'&&!en.publishing_enabled&&!zh.publishing_enabled);
  check(checks,'source_build',stable(en.source_build)===stable(zh.source_build));
  check(checks,'source_urls',stable(urls(en))===stable(urls(zh)));
  check(checks,'outcome_count',en.youtube.learning_outcomes.length===zh.youtube.learning_outcomes.length);
  check(checks,'storyboard_sections',en.youtube.storyboard.length===zh.youtube.storyboard.length);
  check(checks,'storyboard_point_counts',stable(lengths(en))===stable(lengths(zh)));
  check(checks,'canonical_pair',en.seo_geo.canonical===`https://feeeye.com/learn/${en.topic_id}`&&zh.seo_geo.canonical===`https://feeeye.com/zh/learn/${en.topic_id}`);
  check(checks,'tool_link_pair',en.youtube.tool_demo.path.startsWith('https://feeeye.com/tools/')&&zh.youtube.tool_demo.path.startsWith('https://feeeye.com/zh/tools/'));
  check(checks,'community_checklist',en.community.checklist.length===zh.community.checklist.length);
  check(checks,'warning_count',en.community.warnings.length===zh.community.warnings.length);
  check(checks,'review_requirements',stable(en.community.requirements)===stable(zh.community.requirements));
  check(checks,'measurement',stable(en.measurement)===stable(zh.measurement));
  check(checks,'external_actions_disabled',!en.youtube.automatic_upload&&!zh.youtube.automatic_upload&&!en.community.automatic_posting&&!zh.community.automatic_posting);
  const failed=checks.filter(x=>!x.ok);
  return {schema_version:1,topic_id:en.topic_id,status:failed.length?'failed':'passed',automatic_repair:false,publication_allowed:false,checks,failed_count:failed.length,note:'Structural and evidence parity does not replace human semantic review.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),topic=args[args.indexOf('--topic')+1];if(!LEARNING_ARTICLES.some(x=>x.slug===topic))throw new Error('Usage: --topic REGISTERED_ID [--out FILE]');const generatedAt=new Date().toISOString(),report=compareMultichannelBriefs(buildMultichannelBrief({topicId:topic,locale:'en',generatedAt}),buildMultichannelBrief({topicId:topic,locale:'zh',generatedAt})),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],report,path.join(root,'ops/automation/working'));console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=2;}
