#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { snapshot, snapshotHash, digest, benchmarkRows, feeText, rateText, chartSvg, chartPath } from './benchmark.mjs';
import { sourceReview, reviewHash, assessReview, reviewMarkdown } from './source_review.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(root, 'ops/automation/config.json')));
if (config.publishing_enabled !== false || config.mode !== 'local_draft_only' || Object.values(config.channels).some(Boolean)) throw new Error('This generator only supports publishing-disabled local drafts');
if (process.argv.slice(2).some(arg => arg !== '--png')) throw new Error('Only --png is supported. No publish command exists.');
const files = {};
const readiness=assessReview(sourceReview,sourceReview.observed_at);
files['source-review.json']=JSON.stringify(sourceReview,null,2)+'\n';
files['source-review.md']=reviewMarkdown();
files['readiness.json']=JSON.stringify(readiness,null,2)+'\n';
const rows = benchmarkRows();
const csvCell = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
files['facts.json'] = JSON.stringify(snapshot, null, 2) + '\n';
files['fees.csv'] = [
  ['snapshot','exchange','rate_model','rate_percent','fee_usdt_equivalent','notional_usdt_equivalent','verified_at','effective_at','source'],
  ...rows.map(r => [snapshot.version,r.name,r.kind,rateText(r),r.fee.toFixed(2),snapshot.notional,r.verified_at,r.effective_at,r.source])
].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
for (const lang of ['en','zh']) {
  const zh = lang === 'zh';
  const url = `https://feeeye.com/${zh ? 'zh/' : ''}research/${snapshot.id}?utm_source=x&utm_medium=social&utm_campaign=1000-usdt-fee`;
  const htmlPath = path.join(root, 'dist', zh ? 'zh' : '', 'research', snapshot.id + '.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (!html.includes(chartPath(lang)) || !html.includes('HISTORICAL SNAPSHOT')) throw new Error('Rebuild the website before generating a pack');
  files[`page-${lang}.html`] = html;
  files[`chart-${lang}.svg`] = chartSvg(lang);
  const summary = rows.map(r => `${r.name}: ${feeText(r,lang)} USDT${zh ? '等值' : '-equivalent'} (${rateText(r)})`).join('\n');
  const posts = zh ? [
    `1000 USDT等值现货单，基础交易费只是成本的一部分。${snapshot.source_reviewed_at}历史公开费率核算，非当前报价、非真实成交。标准档无折扣；不含价差、滑点、入金、提币、税务。\n${url}`,
    `“最高费率”不是你的确定报价。FeeEye的${snapshot.source_reviewed_at}历史对比保留费率上限与未知成本；真实档位、地区和扣费币种，仍要看订单预览。\n${url}`,
    `比较手续费前，先确认地区是否可用、交易对、账户档位和退出网络。最低费率不等于最适合你。查看${snapshot.source_reviewed_at}历史核算与排除项：\n${url}`
  ] : [
    `1,000 USDT-equivalent spot fee study (${snapshot.source_reviewed_at} snapshot). Entry tier, no discounts. Not a live quote or executed trade; excludes spread, slippage, funding, withdrawal and tax.\n${url}`,
    `A fee ceiling is not your exact quote. Our ${snapshot.source_reviewed_at} historical fee study keeps ceilings explicit. Check your account tier, region and fee asset in the order preview.\n${url}`,
    `Before comparing fees: check region, pair, tier and exit network. The lowest headline fee is not a recommendation. Historical ${snapshot.source_reviewed_at} calculation and exclusions:\n${url}`
  ];
  files[`x-${lang}.json`] = JSON.stringify({status:'draft', account:null, posts:posts.map((text,i)=>({id:`${snapshot.id}-${lang}-${i+1}`,text,attachment:`chart-${lang}.png`,fallback_attachment:`chart-${lang}.svg`,approved:false}))},null,2)+'\n';
  files[`review-${lang}.md`] = zh
    ? `# 1000 USDT内容包：待审核，禁止直接发布\n\n历史来源日期：${snapshot.source_reviewed_at}；本次编辑日期：${snapshot.editorial_updated_at}。迁移旧记录，不代表重新核验。\n\n${summary}\n\n口径：普通档、标准现货吃单、无折扣；单位是USDT等值，不是保证从USDT扣款。上限不是精确报价；非真实成交。\n\n排除：价差、滑点、入金、提币、税务。\n\n商业披露：FeeEye部分平台链接可能产生返佣，返佣不参与本表计算或排序。帖子不得另加未披露的推广链接。\n\n## 发布前核对\n\n- 官方来源、地区、产品、档位与日期\n- 中英页面和图片所有数值\n- 目标账号、最终图片、正文与落地页\n- 如宣传当前费率，必须创建新核验快照\n- 网站部署并核验后，才人工发布并记录帖子URL\n`
    : `# 1,000 USDT pack: DRAFT — DO NOT PUBLISH\n\nSource record: ${snapshot.source_reviewed_at}; editorial date: ${snapshot.editorial_updated_at}. Migrated records, not a fresh verification.\n\n${summary}\n\nEntry tier, standard spot taker, no discounts. USDT-equivalent does not specify the debited asset. Ceilings are not exact quotes. No trades executed.\n\nExcludes spread, slippage, funding, withdrawal, tax.\n\nDisclosure: some FeeEye platform links may earn referral commissions; commissions do not affect this calculation or ordering. No undisclosed affiliate links may be added to posts.\n\nReview sources, regional/product scope, numbers, images, account and landing page. Reverify in a new snapshot before claiming current rates. Confirm site deployment before manual posting and record the final post URL.\n`;
  files[`video-script-${lang}.md`] = zh
    ? `# 视频脚本草案：基础手续费不等于总成本\n\n开场：1000 USDT等值买币，看一个费率数字够吗？\n\n展示：FeeEye ${snapshot.source_reviewed_at}历史快照。没有真实下单，不是当前报价。\n\n计算：费用等值 = ${snapshot.notional} × 基础吃单费率。\n\n${summary}\n\n演示：指出上限与确定费率的区别；打开计算器，提醒按用户实际条件核对。\n\n风险：地区、账户档位、交易对、扣费币种需确认；价差、滑点、入金、提币和税务不在本表中。\n\n收尾：先了解方法，再独立核对，不依据最低费率直接选择平台。网站部分平台链接有返佣，与本表计算和排序无关。\n`
    : `# Video draft: the trading fee is not total cost\n\nHook: Is one headline rate enough for a 1,000 USDT-equivalent purchase?\n\nShow the ${snapshot.source_reviewed_at} historical snapshot, not a live quote or executed trade.\n\nFormula: equivalent fee = ${snapshot.notional} × base taker rate.\n\n${summary}\n\nExplain ceilings; demonstrate the calculator using the viewer's actual assumptions.\n\nCheck region, pair, tier and fee asset. Spread, slippage, funding, withdrawal and tax are excluded.\n\nClose: learn the method and verify independently. Some FeeEye platform links earn commissions; these do not affect calculations or ordering.\n`;
}
if (process.argv.includes('--png')) {
  const modulePath = process.env.FEEEYE_SHARP_MODULE;
  if (!modulePath || !path.isAbsolute(modulePath)) throw new Error('--png requires FEEEYE_SHARP_MODULE pointing to an existing trusted sharp module (no install)');
  const { default: sharp } = await import(pathToFileURL(modulePath).href);
  for (const lang of ['en','zh']) files[`chart-${lang}.png`] = await sharp(Buffer.from(files[`chart-${lang}.svg`])).png().toBuffer();
}
const fileHashes = Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)).map(([name,body])=>[name,digest(body)]));
const contentHash = digest(JSON.stringify(fileHashes));
const manifest = {schema_version:1,campaign_id:'1000-usdt-fee',snapshot_version:snapshot.version,snapshot_hash:snapshotHash,review_hash:reviewHash,promotion_hold:!readiness.current_claims_ready,content_hash:contentHash,status:'draft',publishing_enabled:false,approval:null,published_urls:[],png_ready:Boolean(files['chart-en.png']),files:fileHashes};
files['manifest.json'] = JSON.stringify(manifest,null,2)+'\n';
const output = path.join(root,'ops/automation/generated',`${snapshot.version}-${contentHash.slice(0,16)}`);
// Never overwrite a previous review pack, including a manually modified file.
if (fs.existsSync(output)) {
  for (const [name,body] of Object.entries(files)) if (!fs.existsSync(path.join(output,name)) || digest(fs.readFileSync(path.join(output,name))) !== digest(body)) throw new Error('Existing pack differs; preserve it for review: '+name);
} else {
  fs.mkdirSync(output,{recursive:true});
  for (const [name,body] of Object.entries(files)) fs.writeFileSync(path.join(output,name),body,{flag:'wx'});
}
console.log(JSON.stringify({status:'draft',output,content_hash:contentHash,png_ready:manifest.png_ready,publishing_enabled:false,promotion_hold:manifest.promotion_hold}));
