# 自动化运营第二十八阶段:周报复盘自动装配

日期:2026-10-20。状态:阶段 1 已实现(周报装配 + 调度 + 测试);`docs/operations-review-automation-plan-2026-10-20.md` 的阶段 2-5(链路自检、内容生命周期、下周提案、趋势)尚未实现。

## 背景

周一采集批(GSC / Cloudflare / 跨渠道 / 实验观察 / 反馈闭环,02:17–03:37 UTC)自 2026-09 起持续自动运行并写入加密账本,但 `weekly_report.mjs` 没有调度方也没有数据来源——12 项指标需要人工拼 JSON,周报从未产出。本阶段补上「装配 + 调度」,不改采集侧。

## 新增

- `build/ops/weekly_review.mjs`:
  - `--stage-manual`:把人工补充(affiliate 后台周聚合、总人工小时、内容效率行、可选 Bing AI 导出)按严格 schema 加密写入账本 `manual/weekly-<ISO周>.json.enc`。人工补充与周窗口绑定,窗口必须为 7 个完整天。
  - `--assemble`:从账本读取各来源最新加密回执并映射为 `weekly_report.mjs` 的输入——GSC(trailing 28 天页面聚合,coverage 如实标 partial)、Cloudflare(逐日序列按周窗口切片,EU 排除口径保留)、X(窗口内真实发布回执计数 + 最新指标分析中各帖最新检查点的 url_clicks 累计)、人工补充(affiliate/人工小时/内容行/Bing)。
  - `--render`:装配 → 渲染 → 以内容寻址文件名(`reports/weekly/<周标签>__<sha256 前 16 位>.md.enc`)加密写回账本。同内容重跑幂等;人工补充晚到后的重跑生成新版本,旧版本保留供审计。
  - 缺失语义:某来源回执缺失或过期(GSC 超 10 天)→ 该组指标 null + coverage missing,生成不中断;周报 notes 记录降级原因。
- `.github/workflows/weekly-review.yml`:周一 10:17 UTC(北京 18:17,在采集批之后),`vars.FEEEYE_WEEKLY_REVIEW == 'enabled'` 门控 + 手动触发;与账本写入方共享 `x-receipt-ledger` concurrency 组;只提交 `reports/weekly` 并上传加密 artifact(30 天)。
- `build/ops/test_weekly_review.mjs`:覆盖工作流契约、窗口/周标签、装配映射、部分覆盖(6/7 天)、无人工补充、人工 schema 拒绝、过期降级、内容寻址重渲染、CLI 端到端;已接入 `validate-site`。

## 语义修正(2026-10-20)

X 发布回执的 `reconciled` 字段语义是「该请求是否匹配到已存在的帖子」(防重复发布),**真实发布的帖子保持 `false` 是正确状态**。账号 @FeeEyeOfficial 至今仅 1 条授权试运行帖(2026-09-03),无后续 API 消耗,无需对账动作。早前规划稿中「翻转 reconciled」的表述是误读,已更正。

## 边界

- 复盘只读:不发布、不选题、不修改线上内容、不推送 main。
- 人工补充含 affiliate 聚合数,只能以密文进账本分支;公开仓库仅 schema 与测试夹具(虚构数字)。
- Bing AI 指标仅在有授权导出时由人工补充提供,否则保持 missing,不估算。
- 周报数字 100% 来自回执或人工输入;脚本不做任何推算。

## 启用步骤(待仓库所有者执行)

1. 合并本阶段 PR 与 PR #35。
2. 在仓库 Settings → Secrets and variables → Actions 添加变量 `FEEEYE_WEEKLY_REVIEW = enabled`。
3. (可选)首跑验证:Actions → weekly-review → Run workflow。
4. 每周日仪式(affiliate 自 2026-10-26 暂缓,manual 只填 human_hours 与内容行,可选):`FEEEYE_OPS_DATA_KEY=<base64> node build/ops/weekly_review.mjs --stage-manual --input weekly.json --store <账本 checkout>` → 提交账本分支。
