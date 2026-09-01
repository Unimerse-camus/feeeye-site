#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const dist=path.join(root,'dist');
const release=readJson(path.join(dist,'release.json'));
const pages=[], excluded=[];
const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name.endsWith('.html')){const html=fs.readFileSync(file,'utf8');if(/<link rel="canonical"/.test(html))(html.includes('<meta name="robots" content="noindex')?excluded:pages).push({file,html});}}};
walk(dist);
const fail=(condition,message)=>{if(!condition)throw new Error(message);};
const objects=value=>Array.isArray(value)?value.flatMap(objects):value&&typeof value==='object'?[value,...Object.values(value).flatMap(objects)]:[];
let articles=0, citedArticles=0, faqQuestions=0;
for(const {file,html} of pages) {
  const rel=path.relative(dist,file);
  fail((html.match(/<h1[ >]/g)||[]).length===1,'Expected one H1: '+rel);
  fail(/<title>[^<]+<\/title>/.test(html)&&/<meta name="description" content="[^"<>]+">/.test(html),'Missing title or description: '+rel);
  fail((html.match(/rel="canonical"/g)||[]).length===1,'Invalid canonical count: '+rel);
  for(const lang of ['en','zh','x-default']) fail(new RegExp(`hreflang="${lang}"`).test(html),'Missing hreflang '+lang+': '+rel);
  fail(!/<meta name="robots" content="noindex/.test(html),'Canonical page is noindex: '+rel);
  const blocks=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));
  const nodes=blocks.flatMap(objects);
  fail(nodes.some(x=>x['@type']==='Organization'&&x['@id']==='https://feeeye.com/#organization'),'Missing Organization entity: '+rel);
  fail(nodes.some(x=>x['@type']==='WebSite'&&x['@id']==='https://feeeye.com/#website'),'Missing WebSite entity: '+rel);
  for(const node of nodes.filter(x=>x['@type']==='Article')) {
    articles++;
    fail(/^\d{4}-\d{2}-\d{2}$/.test(node.dateModified||''),'Article missing review date: '+rel);
    fail(node.author?.['@id']==='https://feeeye.com/#organization'&&node.publisher?.['@id']==='https://feeeye.com/#organization','Article entity mismatch: '+rel);
    if(Array.isArray(node.citation)&&node.citation.length)citedArticles++;
  }
  for(const node of nodes.filter(x=>x['@type']==='Question')) {
    faqQuestions++;
    fail(!('answer' in node)&&node.acceptedAnswer?.['@type']==='Answer'&&typeof node.acceptedAnswer.text==='string','Invalid FAQ answer: '+rel);
  }
}
const robots=fs.readFileSync(path.join(dist,'robots.txt'),'utf8');
const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
fail(/User-agent: OAI-SearchBot\nAllow: \//.test(robots),'OAI-SearchBot is not explicitly allowed');
fail(/User-agent: \*\nAllow: \//.test(robots)&&robots.includes('Sitemap: https://feeeye.com/sitemap.xml'),'General crawler or sitemap rule missing');
fail(pages.length===release.canonical_url_count,'Canonical page count does not match release');
for(const {html,file} of excluded) {
  const canonical=html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  fail(canonical&&!sitemap.includes(`<loc>${canonical}</loc>`),'Noindex compatibility page leaked into sitemap: '+path.relative(dist,file));
}
fail(articles>=18&&citedArticles===articles,'Learning/research articles must expose visible-source citations');
fail(faqQuestions>0,'No FAQ questions found');
console.log(`[OK] SEO/GEO audit: ${pages.length} indexable canonical pages, ${excluded.length} noindex pages excluded, site entities, en/zh/x-default, ${articles} cited articles, ${faqQuestions} valid FAQ questions, OAI-SearchBot allowed.`);
