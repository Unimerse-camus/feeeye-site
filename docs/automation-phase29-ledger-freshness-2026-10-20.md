# 自动化运营第二十九阶段:复盘链路自检

日期:2026-10-20。状态:已实现并上线。对应 `docs/operations-review-automation-plan-2026-10-20.md` 阶段 2。

## 背景

阶段 28 让周报自动装配,但「采集侧自身失灵」仍不可见:如果周一采集批某个环节连续失败,周报只会静默降级为 missing。本阶段给账本加新鲜度自检,让降级从"被动发现"变成"每日主动告警 + 周报明示"。

## 新增

- `build/ops/ledger_freshness.mjs`:
  - 周采集目录(`search/gsc`、`analytics/cloudflare`、`cross-channel`、`experiments`、`feedback`)最近提交超过 **8 天** → `degraded` + 中文告警行;恰好 8 天仍算 ok(周一采集、周一检查的正常余量)。
  - 低频目录(`x`、`x-metrics`、`x-analysis`、`manual`、`reports/weekly`)只记录年龄不告警——无帖子/无人工补充时本来就不该有新提交。
  - 纯逻辑 `evaluateFreshness(entries, now)` 与 git 采集 `collectFreshness(store, now)` 分离;CLI 输出 JSON 并对告警打 `::warning::` 注解。fail-open:只告警,不重跑采集、不阻断周报。
- `ops-health.yml`(每日 09:17 北京)新增账本 checkout + freshness 步骤 → **每日**发现链路降级。
- `weekly-review.yml` 渲染前跑 freshness,告警行经 `--freshness-report` 进入周报 **备注** 区;summary 新增 `ledger_status`。
- `weekly_report.mjs` 模板新增「备注」小节(notes 非空时渲染)。
- 同轮修复:装配 note 去掉实时时间戳——时间由账本提交与内容寻址文件名承载,保证同输入重跑幂等(此前每次重跑都会因时间戳差异生成新版本文件)。
- `test_ledger_freshness.mjs`(纯逻辑边界 + 临时 git 仓库集成 + 两个工作流契约断言)+ `test_weekly_review.mjs` 扩展 freshness 集成断言;两者接入 `validate-site` 与 `validate_local`。

## 边界

- 只读检查:不重跑失败的采集,不修改任何回执。
- 账本 checkout 需要完整历史(git log 按目录取最后提交时间),两个工作流的账本 checkout 均不设 `fetch-depth`。
- 告警是唯一输出通道(GitHub Actions warning 注解 + 周报备注);没有通知系统,依赖每日 ops-health 与每周周报的人工查看。
