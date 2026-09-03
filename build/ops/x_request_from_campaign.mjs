#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildXPublishRequest } from './x_publish_executor.mjs';
import { readJson, validInstant, writeNewJson } from './ops_util.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const CONTENT_TYPES={
  'cost-en':'methodology','transfer-en':'evergreen_safety',
  'cost-zh':'methodology','transfer-zh':'evergreen_safety'
};

function verifiedDeployment(verification,bilingual) {
  if(verification?.schema_version!==1||verification.status!=='matched'||verification.base_url!=='https://feeeye-site.pages.dev'||!/^[a-f0-9]{64}$/.test(verification.build_id||'')||!/^[a-f0-9]{40}$/.test(verification.source_revision||'')||!validInstant(verification.checked_at))throw new Error('Exact production deployment receipt is required');
  if(bilingual?.schema_version!==1||bilingual.status!=='verified'||bilingual.distribution_allowed!==true||bilingual.failed_count!==0||bilingual.build_id!==verification.build_id||bilingual.source_revision!==verification.source_revision||!validInstant(bilingual.checked_at)||!Array.isArray(bilingual.results)||bilingual.results.some(item=>item.status!=='passed'))throw new Error('Matching bilingual production receipt is required');
  return{base_url:'https://feeeye.com',build_id:verification.build_id,source_revision:verification.source_revision,verified_at:verification.checked_at,bilingual_verified_at:bilingual.checked_at};
}

export function requestFromCampaign({campaign,postId,verification,bilingualVerification,policy,createdAt=new Date().toISOString(),leadMinutes=5}) {
  if(campaign?.id!=='feeeye-launch'||campaign.status!=='draft'||campaign.publishing_enabled!==false||campaign.approval!==null)throw new Error('Frozen FeeEye launch campaign is required');
  if(!Object.prototype.hasOwnProperty.call(CONTENT_TYPES,postId))throw new Error('Only text-only education posts are supported');
  if(!validInstant(createdAt)||![0,5].includes(leadMinutes))throw new Error('Canonical request time and allowed lead are required');
  const post=campaign.posts?.find(item=>item.id===postId);
  if(!post||post.image!==null||!['en','zh'].includes(post.locale))throw new Error('Text-only campaign post is missing or invalid');
  const urls=post.text.match(/https:\/\/\S+/g)||[];
  if(urls.length!==1)throw new Error('Campaign post must have exactly one URL');
  const notBefore=new Date(Date.parse(createdAt)+leadMinutes*60_000).toISOString();
  const expiresAt=new Date(Date.parse(notBefore)+15*60_000).toISOString();
  return buildXPublishRequest({schema_version:1,request_id:`${post.id}-${verification.source_revision.slice(0,12)}`,channel:'x',target_account:'FeeEyeOfficial',locale:post.locale,content_type:CONTENT_TYPES[post.id],created_at:createdAt,not_before:notBefore,expires_at:expiresAt,text:post.text,landing_url:urls[0],deployment:verifiedDeployment(verification,bilingualVerification),gates:{source_current:true,deployment_verified:true,bilingual_verified:true,landing_pages_valid:true}},policy);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),value=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:null;},postId=value('--post-id'),verificationFile=value('--verification'),bilingualFile=value('--bilingual-verification'),out=value('--out'),leadMinutes=value('--lead-minutes')===null?5:Number(value('--lead-minutes'));
  if(!postId||!verificationFile||!bilingualFile||!out)throw new Error('Usage: --post-id ID --verification FILE --bilingual-verification FILE --out FILE');
  const request=requestFromCampaign({campaign:readJson(path.join(root,'ops/automation/campaigns/x-launch-2026-08-31.json')),postId,verification:readJson(verificationFile),bilingualVerification:readJson(bilingualFile),policy:readJson(path.join(root,'ops/automation/autonomy-policy.json')),leadMinutes});
  writeNewJson(out,request,path.join(root,'ops/automation/working'));console.log(JSON.stringify({request_id:request.request_id,post_id:postId,post_created:false}));
}
