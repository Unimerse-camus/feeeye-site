#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEARNING_ARTICLES, LEARNING_SOURCES } from '../learning_content.mjs';
import { readJson, stable, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const nodes=value=>Array.isArray(value)?value.flatMap(nodes):value&&typeof value==='object'?[value,...Object.values(value).flatMap(nodes)]:[];
const jsonNodes=html=>[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match=>nodes(JSON.parse(match[1])));
const count=(html,pattern)=>(html.match(pattern)||[]).length;
function inspect(html,{canonical,language,sourceUrls,expected}) {
  if(!/<title>[^<]+<\/title>/.test(html)||count(html,/<h1[ >]/g)!==1||/>undefined<|>NaN<|null×/.test(html))throw new Error('Visible page structure failed');
  if(!html.includes(`<link rel="canonical" href="${canonical}">`))throw new Error('Canonical mismatch');
  const data=jsonNodes(html),article=data.find(x=>x['@type']==='Article'),questions=data.filter(x=>x['@type']==='Question');
  if(!article||article.inLanguage!==language||!/^\d{4}-\d{2}-\d{2}$/.test(article.dateModified||''))throw new Error('Article metadata mismatch');
  const citations=[...(article.citation||[])].sort();
  if(stable(citations)!==stable([...sourceUrls].sort())||sourceUrls.some(url=>!html.includes(url)))throw new Error('Source citation mismatch');
  const outcomeBlock=html.match(/<div class="learn-outcomes">([\s\S]*?)<\/div>/)?.[1]||'',result={date_modified:article.dateModified,citations,faq_count:questions.length,section_count:count(html,/class="learn-content-section"/g),outcome_count:count(outcomeBlock,/<li>/g),high_risk:html.includes('learn-risk high')};
  if(result.faq_count!==expected.faq_count||result.section_count!==expected.section_count||result.outcome_count!==expected.outcome_count||result.high_risk!==expected.high_risk)throw new Error('Page does not match the registered content structure');
  return result;
}
export async function checkLiveBilingual({baseUrl,expectedRelease,topics=LEARNING_ARTICLES.map(x=>x.slug),fetchImpl=fetch,checkedAt=new Date().toISOString()}) {
  const base=new URL(baseUrl);if(base.protocol!=='https:'||expectedRelease?.status!=='matched'||!validInstant(checkedAt))throw new Error('Verified deployment receipt required');
  const releaseResponse=await fetchImpl(new URL('/release.json',base));if(!releaseResponse.ok)throw new Error('release.json unavailable');const release=await releaseResponse.json();if(release.build_id!==expectedRelease.build_id||release.source_revision!==expectedRelease.source_revision)throw new Error('Live release changed after deployment receipt');
  const results=[];
  for(const topic of topics){try{const article=LEARNING_ARTICLES.find(x=>x.slug===topic);if(!article)throw new Error('Unknown topic');const sourceUrls=article.sources.map(key=>LEARNING_SOURCES[key].url),enUrl=new URL(`/learn/${topic}`,base),zhUrl=new URL(`/zh/learn/${topic}`,base),responses=await Promise.all([fetchImpl(enUrl),fetchImpl(zhUrl)]);if(responses.some(x=>!x.ok||!(x.headers.get('content-type')||'').includes('text/html')))throw new Error('Bilingual page HTTP failure');const html=await Promise.all(responses.map(x=>x.text()));if(!html[0].includes(`hreflang="zh" href="${zhUrl}"`)||!html[1].includes(`hreflang="en" href="${enUrl}"`)||!html[0].includes(`hreflang="x-default" href="${enUrl}"`)||!html[1].includes(`hreflang="x-default" href="${enUrl}"`))throw new Error('Reciprocal hreflang mismatch');const expected={faq_count:article.en.quiz.length,section_count:article.en.sections.length,outcome_count:article.en.outcomes.length,high_risk:article.risk==='high'},en=inspect(html[0],{canonical:enUrl.toString(),language:'en',sourceUrls,expected}),zh=inspect(html[1],{canonical:zhUrl.toString(),language:'zh-CN',sourceUrls,expected});if(en.date_modified!==zh.date_modified||en.faq_count!==zh.faq_count||en.section_count!==zh.section_count||en.outcome_count!==zh.outcome_count||en.high_risk!==zh.high_risk)throw new Error('Bilingual structure or risk mismatch');results.push({topic,status:'passed',en,zh});}catch(error){results.push({topic,status:'failed',reason:error.message});}}
  const failed=results.filter(x=>x.status==='failed');return{schema_version:1,status:failed.length?'failed':'verified',base_url:base.origin,build_id:release.build_id,source_revision:release.source_revision,checked_at:checkedAt,automatic_repair:false,distribution_allowed:failed.length===0,failed_count:failed.length,results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2),baseUrl=args[args.indexOf('--base-url')+1],receiptFile=args[args.indexOf('--expected-release')+1];if(!baseUrl||!receiptFile)throw new Error('Usage: --base-url URL --expected-release FILE [--all|--topic ID] [--out FILE]');const topicIndex=args.indexOf('--topic'),topics=topicIndex>=0?[args[topicIndex+1]]:LEARNING_ARTICLES.map(x=>x.slug),report=await checkLiveBilingual({baseUrl,expectedRelease:readJson(receiptFile),topics}),out=args.indexOf('--out');if(out>=0)writeNewJson(args[out+1],report,path.join(root,'ops/automation/working'));console.log(JSON.stringify(report,null,2));if(report.status!=='verified')process.exitCode=2;}
