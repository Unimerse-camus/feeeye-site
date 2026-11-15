# 自动化运营第三十三阶段:行情刷新 PR 白名单门控自动合并

日期:2026-11-15。状态:已实现;首次端到端实测见本文末尾。授权:所有者 2026-11-15 会话批准"启用 auto-merge 治理方案"。

## 背景

每日行情刷新产生的审核 PR(机器人创建)需要人工"批准校验 + 合并",该环节两次造成数据断供(10 月积压 5 周、11 月积压 3 周)。蓝图 W2/W5 早已预留该方向:"日常数值刷新只有在明确授权字段/来源/范围后才能自动合并"。本阶段落地,并把"范围"变成硬校验。

## 机制(`.github/workflows/refresh-automerge.yml`)

触发:`workflow_run` 挂在 refresh-coin-data 完成之后(与 x-analysis 相同的既有模式),外加 `workflow_dispatch` 供监督下手动测试。链式触发不依赖机器人 PR 的 `pull_request` 事件,避开 action_required 的第一层坑。

五步,全部 fail-closed:

1. **上游成功门**:只有刷新工作流成功结束才继续;
2. **找 PR**:无开放 PR(数据无变化)→ 干净退出;
3. **白名单门(核心保险)**:PR diff 的文件集合必须是 `data/coins.json`、`data/coin-url-registry.json`、`data/exchanges.js` 的子集(这三个正是刷新工作流自身 `git add` 的全部范围);空 diff 或任何白名单外文件 → 红色失败,留给人工;
4. **批准 + 等待必需校验**:用 `actions: write` 权限批准卡在 action_required 的 validate 运行,轮询至其成功;
5. **普通合并**:`gh pr merge --merge`(分支保护全程序生效,无 --admin 绕过)。

权限最小化:contents/pull-requests/actions 各 write,不接触账本与任何 Secrets。

## 治理边界

- 本方案只覆盖**数值刷新 PR**(三文件白名单);内容性 PR(文章、代码)仍 100% 人工审合并,`autonomy-policy.json` 的内容自治边界不变;
- `test_refresh_automerge_workflow.mjs` 把上述契约(触发、门、白名单三文件、无 admin、无私钥)钉死进 validate-site 与 validate_local;
- 若 GITHUB_TOKEN 无法批准 pending 运行(权限边界不确定,首次实测验证),工作流显式失败并告警,回退方案为所有者 PAT 建 PR(另行决策)。

## 记录

- 2026-11-15 首次实测:手动 dispatch refresh-coin-data 产生当日 PR → automerge 链自动触发 → 白名单通过 → 批准 validate → 校验通过 → 自动合并。(结果见仓库 Actions)
