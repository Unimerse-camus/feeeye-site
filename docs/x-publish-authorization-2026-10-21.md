# FeeEye X 受控发布授权边界(2026-10-21)

日期:2026-10-21。授权人:仓库所有者(在 2026-10-21 会话中批准"英文 + 受控 API 发布 cost-en 一条"的方案)。执行载体:`.github/workflows/x-publish.yml` + `ops/automation/x-publish-policy.json`。

## 授权范围

- **本次批准发布:`cost-en` 一条**(冻结 campaign `feeeye-launch` 中的纯文本教育帖,英文,落地页 `/learn/crypto-total-cost`)。
- 工作流机制上可选 `cost-zh` / `transfer-zh`,但**尚未授权**:中文帖需先做账号语言决定(单一账号语言规则),并为本文件补一段日期与范围明确的附录后再发。
- 带图片的 `launch-en` / `launch-zh` 不在机制支持范围内(执行器仅支持纯文本),不授权。

## 每次发布必须满足的既有门禁(全部自动执行)

1. main 源码全量本地校验通过;
2. 精确部署回执匹配(当前 dispatch 的 commit 即线上版本);
3. 全站双语页面校验 0 失败且允许分发;
4. 正文与 2026-08-31 冻结 campaign 逐字一致(哈希绑定,改字即拒绝);
5. 幂等键防重发 + 执行器在 API 层扫描近期同文帖(重复请求返回 `post_created:false`,不二次发帖);
6. 请求 15 分钟时效;
7. 永久回执写入 `automation-receipts` 账本。

## 人工授权机制(与 2026-09-03 试运行同构)

- 仓库变量 `FEEEYE_X_PUBLISH = enabled`(由所有者控制;关闭即停止一切发布);
- 每次 dispatch 必须人工输入与 post_id 匹配的确认串(`PUBLISH_COST-EN_ONCE` 形式);**dispatch 这个动作就是单帖授权本身**;
- 预算沿用 autonomy 帽:每月 $5 上限、不自动充值;
- 不授权:定时/排程发布、回复、提及、私信、点赞、转发、删帖、多帖批量。

## 发布后自动发生

回执落账本 → x-metrics 每日采集 24h/7d/28d 检查点 → x-analysis 汇入周报 → 周日仪式把 url_clicks 等计入人工补充与漏斗。

## 记录

- 2026-09-03 试运行(`transfer-en`)已完成全周期:1 帖、三检查点采集完毕、回执 `reconciled:false`(真实发布,正确状态)。
- 本文件不改变 `x-live-trial.yml`(一次性试运行工作流,变量已禁用,保留作历史记录)。
