#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEARNING_ARTICLES, LEARNING_REVIEWED_AT, LEARNING_SOURCES } from '../learning_content.mjs';
import { readJson, sha256, stable, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const flatten=section=>[...(section.paragraphs||[]),...(section.bullets||[]),...(section.warning?[section.warning]:[]),...(section.checklist||[])];
export function buildMultichannelBrief({topicId,locale,generatedAt=new Date().toISOString(),dist=path.join(root,'dist')}) {
  if(!['en','zh'].includes(locale)||!validInstant(generatedAt))throw new Error('Invalid locale or generation time');
  const article=LEARNING_ARTICLES.find(x=>x.slug===topicId);if(!article)throw new Error('Unknown registered topic');
  const copy=article[locale],zh=locale==='zh',prefix=zh?'zh/':'',landingPath=`${prefix}learn/${topicId}.html`,toolPath=`${prefix}${copy.tool.path}`;
  if(!fs.existsSync(path.join(dist,landingPath))||!fs.existsSync(path.join(dist,toolPath)))throw new Error('Validated landing page or tool is missing');
  const release=readJson(path.join(dist,'release.json'));if(!/^[a-f0-9]{64}$/.test(release.build_id||''))throw new Error('Validated build receipt is missing');
  const sources=article.sources.map(key=>LEARNING_SOURCES[key]).map(x=>({label:x.label,url:x.url}));
  const contentHash=sha256(stable({topic_id:topicId,locale,reviewed_at:LEARNING_REVIEWED_AT,article:copy,sources,build_id:release.build_id}));
  const sections=copy.sections.map((section,index)=>({order:index+1,title:section.title,grounded_points:flatten(section)}));
  const checklist=copy.sections.flatMap(x=>x.checklist||[]);
  const warnings=copy.sections.flatMap(x=>x.warning?[x.warning]:[]);
  const canonical=`https://feeeye.com/${prefix}learn/${topicId}`;
  return {schema_version:1,id:`${topicId}-${locale}-${contentHash.slice(0,12)}`,status:'draft',publishing_enabled:false,generated_at:generatedAt,topic_id:topicId,locale,content_hash:contentHash,source_build:{build_id:release.build_id,source_revision:release.source_revision??null,content_reviewed_at:LEARNING_REVIEWED_AT},sources,
    seo_geo:{mode:'material_update_existing_page',canonical,search_intent:copy.title,answer_summary:copy.summary,required_checks:['one real user task','visible answer summary','scope and risk limits','visible primary sources','review date','matching structured data','en/zh fact consistency','no fabricated freshness']},
    youtube:{delivery:'manual_studio_upload',target_duration_minutes:{min:3,max:6},title:copy.title,hook:copy.summary,learning_outcomes:copy.outcomes,storyboard:sections,tool_demo:{label:copy.tool.label,path:`https://feeeye.com/${toolPath}`},closing:zh?'先按清单核对，再独立查看官方来源；本内容仅供教育。':'Use the checklist, then verify primary sources independently. Educational only.',automatic_upload:false},
    community:{delivery:'manual_rule_checked_answer',direct_answer:copy.summary,supporting_points:copy.outcomes,checklist,warnings,sources,feeeye_link:{url:canonical,optional:true,disclosure_required:true},requirements:['select a real question manually','read community rules before answering','answer the question without requiring a click','disclose FeeEye relationship if linking','do not reuse identical replies'],automatic_posting:false},
    measurement:{receipt_required:true,checkpoints_after_publication:['24h','7d','28d'],metrics:['effective_visits','human_hours','rule_violation_or_removal'],missing_is_zero:false}};
}
export function validateMultichannelBrief(brief,{dist=path.join(root,'dist')}={}) {
  const rebuilt=buildMultichannelBrief({topicId:brief.topic_id,locale:brief.locale,generatedAt:brief.generated_at,dist});
  if(stable(brief)!==stable(rebuilt))throw new Error('Multichannel brief is stale or modified');return brief;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2),topicId=args[args.indexOf('--topic')+1],locale=args[args.indexOf('--locale')+1];if(!topicId||!locale)throw new Error('Usage: --topic ID --locale en|zh [--out FILE]');
  const brief=buildMultichannelBrief({topicId,locale}),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],brief,path.join(root,'ops/automation/working'));
  console.log(JSON.stringify(brief,null,2));
}
