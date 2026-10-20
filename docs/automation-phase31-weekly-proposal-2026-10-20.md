# 自动化运营第三十一阶段:下周提案(决策闭环出口)

日期:2026-10-20。状态:已实现并上线。对应 `docs/operations-review-automation-plan-2026-10-20.md` 阶段 4。

## 背景

阶段 28-30 之后,周报有了指标、链路状态和内容生命周期,但复盘产物(topic 候选、页面机会、反馈修订、实验观察、自主决策)散在账本不同目录,没有统一出口汇入「下周做什么」的人工决策。本阶段把五个来源汇成周报尾部的「下周提案」区块。

## 新增

- `build/ops/weekly_proposal.mjs`:
  - **主选题候选**:复用既有 `topic_queue.buildTopicQueue`(8 个注册学习主题、≤5 候选、人只选 1),输入信号从 GSC 回执 + 内容登记表**自动派生**——双语页面曝光/点击求和、materially_updated_at 取最近登记日;community_questions 与 ai_citations 无授权来源保持缺失,evidence_status 自动固定 current(人工复核),均如实披露。
  - **页面改进候选**:直接读 cross-channel 报告的 `page_opportunities.candidates`(已在周一算好,不重算)。
  - **反馈修订项**:读 `feedback/revision-plans` 最新回执(article_id / 优先级 / 状态)。
  - **实验状态**:读 `experiments/` 最新观察(状态、原因、样本门、复盘不早于)。
  - **自主引擎建议**:`autonomous_analysis.analyzeAutonomousResults` **首次接入调度**——输入从生命周期条目构造(发布年龄真实、效果取检查点观察值、人工小时来自 manual),输出 observe/hold/maintain/scale/stop(×1.25 上限),仅作建议字段。
  - **渠道效率**:呼应周报达门槛内容(≥30 有效访问)。
- 周报追加「下周提案」区块与 `proposal_candidates` 汇总字段;CLI 可单独输出(`--store --to`)。
- `test_weekly_proposal.mjs` 接入 validate-site 与 validate_local。

## 已知限制(如实标注在提案区块内)

- 自主引擎输入的 `source_current/bilingual_verified/rule_violations/publish_errors` 为自动填入旗标(无违规记录、站内双语由 postdeploy 全量校验背书),需人工周会复核;
- `consecutive_qualified_windows` 固定 0(连续合格窗口历史统计属阶段 5),因此 scale 建议实际不会出现,只会到 maintain——保守方向正确。

## 治理

- 提案只是提案:选题、放大、发布永远人拍板;无候选时输出「维持当前低频节奏」,不编造;
- 放大判定只引用渠道政策既有规则(单条 ≥30 有效访问 + 连续两个合格窗口,上限 ×1.25),不引入新阈值;
- 所有候选可追溯到账本回执;账本无对应回执的来源显示「无回执」而非空转。
