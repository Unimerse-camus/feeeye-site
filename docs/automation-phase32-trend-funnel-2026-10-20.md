# 自动化运营第三十二阶段:4 周趋势、返佣漏斗与连续合格窗口

日期:2026-10-20。状态:已实现并上线。对应 `docs/operations-review-automation-plan-2026-10-20.md` 阶段 5,至此该规划五个阶段全部落地。

## 新增

- `build/ops/weekly_trend.mjs`:
  - **结构化周报历史**:周报渲染时同步落 `reports/weekly/<周>__<摘要>.json.enc`(信封 `{schema_version, rendered_at, input}`);同摘要文件已存在则跳过,不改写不可变账本。趋势与连胜统计的历史来源,替代解析 markdown 的脆弱方案。
  - **近 4 周趋势表**:行=12 项指标,列=周(截止日);历史不足 4 周时如实截断不补 0;仅展示,不自动结论。同周多版本取文件名字典序最新(差异仅限重复渲染)。
  - **返佣漏斗**:点击→注册→激活→交易量→佣金,逐层转化率;数据全部来自人工补充(KuCoin 后台周聚合),缺失层显示 —,无人工补充时明示「漏斗不可用,不估算」;与站内匿名事件不拼接、不构成用户级画像。
  - **连续合格窗口**:`consecutiveQualifiedWindows(history, id, currentQualified)` ——锚定本周,本周不合格连胜归 0;只认人工补充行(人背书的有效访问)。
- `buildAutonomousInput` 接入历史:连续窗口 = 历史连胜 + 本周合格 → **自主引擎的 scale 建议正式可达**(年龄 ≥28 天 + 本周 ≥30 有效访问 + 连续 ≥2 个合格窗口 → ×1.25,任一条件破坏 → hold/stop)。本周人工行合格时 effective_visits 优先取人工值,否则回退检查点观察值。
- 周报 markdown 追加漏斗与趋势两区块;summary 新增 `funnel`(`manual`/`missing`)与 `trend_weeks`。
- `test_weekly_trend.mjs` 接入 validate-site 与 validate_local;连带修正 test_weekly_review 版本计数(只数 md)与 test_weekly_proposal 连胜断言。

## 已知边界

- 历史从本阶段部署起积累;四周前(2026-11 中旬)趋势表才满列——截断语义已如实展示。
- 趋势的同比/环比解读仍留给人工周会;表格不输出方向性结论。
- 漏斗归因窗口以后台口径为准,不同平台数字不拼接成个人漏斗(既有红线)。
