# FeeEye 运营推广规划:自动化复盘闭环(2026-10-20)

> 状态:规划稿(阶段 0-1 实施中,见 `docs/automation-phase28-weekly-review-2026-10-20.md`)。
> 范围:在现有自动化底座上,补全「采集 → 汇总 → 周报 → 决策建议 → 下周执行」的复盘闭环;不新增付费渠道,不改变"人工决策、自动生产"的治理边界。
> 依据:`docs/automation-operations-blueprint-2026-08-31.md`(W8 周报)、`docs/organic-operations-plan.md`、`docs/analytics-measurement-plan.md`、`ops/automation/README.md`、以及 2026-10-20 对仓库与 CI 的只读盘点(注:周一采集批运行正常,最近一轮为 2026-10-19,GSC/CF/跨渠道/实验/反馈五个环节全部落账本)。

---

## 一、为什么先做复盘闭环

当前推广素材(X 稿、YouTube 脚本、社区回答模板、benchmark 内容包)已经备好,但分发节奏停着,原因之一是**没有可持续的复盘机制**:

- 渠道政策(`channel-policy.json`)规定 28 天预注册实验、单条 ≥30 有效访问才比较效率——没有周报,这些门槛永远无法判定;
- 前任留下的 21 个工作流里,采集与分析(周一凌晨批)已全自动,但**周报生成脚本 `weekly_report.mjs` 没有任何调度,也没有任何东西给它喂数据**——12 项指标需要人工拼 JSON;
- 复盘结论没有统一出口汇入下周选题(`topic_queue` / `page_opportunity_queue` / feedback 修订计划各自独立)。

结论:**复盘闭环是推广节奏的离合器**。它先转起来,每周 2-3 条 X、双周一份 benchmark 的分发节奏才有依据、有刹车、有放大条件。

## 二、现状盘点(2026-10-20 核实)

### 已自动化(保留,不重建)

| 环节 | 工作流 / 脚本 | 节奏 | 产物 |
|---|---|---|---|
| 数据刷新 | refresh-coin-data | 每日 16:00 UTC → 审核 PR | data PR(#35 待合并,分支每日自动更新) |
| 站点健康 | ops-health | 每日 01:17 UTC | 日检摘要 |
| GSC 信号 | search-signals-gsc | 周一 02:17 UTC | 加密回执 `search/` |
| CF 分析 | cloudflare-analytics | 周一 02:27 UTC | 加密回执 `analytics/` |
| 跨渠道分析 | cross-channel-analysis | 周一 02:37 UTC | 加密报告(含 decision + 页面机会) |
| SEO 实验观察 | seo-experiment-observer | 周一 02:57 UTC | 加密回执 `experiments/` |
| 反馈闭环 | feedback-operations → zaraz-feedback → revision-planner → diagnostics → link-evidence | 周一 03:07–03:37 UTC | 加密回执 `feedback/` |
| X 指标 | x-metrics(每日)+ x-analysis(workflow_run) | 每日 08:07 UTC | 24h/7d/28d 检查点回执 |
| X 回执账本 | automation-receipts 分支 | 持续 | 幂等发布回执 |

### 缺口(本规划要补的)

| # | 缺口 | 证据 |
|---|---|---|
| G1 | 周报无调度、无自动装配 | `weekly_report.mjs` 仅被测试引用;输入 schema 已定义(`weekly-input.example.json`)但无人生产 |
| G2 | 人工数据无约定入口 | affiliate 后台数、human_hours、内容效率行,现在没有落盘位置 |
| G3 | 内容生命周期检查点只覆盖 X | 24h/7d/28d 逻辑在 `x_metrics_analysis.mjs`;站内内容(benchmark/教程)无检查点 |
| G4 | 复盘→下周选题无统一出口 | topic_queue / page_opportunity_queue / feedback 修订互相独立,无汇总提案 |
| G5 | autonomous_analysis 未接入调度 | 任何工作流都不引用 |
| G6 | 复盘链路自身无健康检查 | ops-health 只查公开端点,不查"周一采集批最近是否成功" |
| G7 | 无趋势视图 | 周报 schema 是单周快照,没有 4 周滚动对比 |

## 三、设计原则(继承现有治理,不新造)

1. **复盘只读,执行仍需人工**:自动汇总、自动建议;选题、放大、发布永远人拍板(与 autonomy-policy shadow 模式一致)。
2. **缺失不记 0**:沿用 `validateWeeklyInput` 的 coverage 三态(complete/partial/missing)+ null 语义。
3. **私有数据不出公开仓库**:affiliate 数、人工小时、效率行全部走 `FEEEYE_OPS_DATA_KEY` 加密进 `automation-receipts` 分支(复用 `private_data_crypto.mjs`),公开仓库只存 schema 和脱敏示例。
4. **复用现有模式**:工作流模板照抄 `cross-channel-analysis.yml`(双 checkout + 加密提交 + artifact 上传 30 天);功能开关用 `vars.FEEEYE_WEEKLY_REVIEW`;测试照 `test_workflow_phase3.mjs` 风格。
5. **不伪造时效**:周报标注每个来源的 coverage.through;来源回执过期(>7 天)自动降级为 partial/missing 并在报告头部提示。

## 四、分阶段实施

### 阶段 0:前提清障(0.5 天内,先做)

1. 合并 PR #35(每日行情刷新,分支由 CI 每日强制更新,最新候选为 2026-10-19)——**main 受分支保护,合并需仓库所有者在 GitHub 页面操作**。
2. X 试运行状态确认(2026-10-20 已确认):账号 @FeeEyeOfficial 仅发布过 1 条授权试运行帖,后续无新 API 消耗;回执中 `reconciled` 字段语义是「该请求是否匹配到已存在的帖子」(防重复发布),**已发布帖保持 `false` 是正确状态,不需要也不应翻转**。
3. 校准文档漂移:README 工具状态表(实际已上线 7 个工具,表里还写 T3-T8 待做)与本规划一起更新,避免接手者误判。

### 阶段 1:周报自动装配与调度(第 1 周,约 1 个工作日)

**新增 `build/ops/weekly_review.mjs`**,三个子命令:

- `--stage-manual`:本地把人工补充数据加密推上账本分支 `manual/weekly-<ISO周>.json.enc`。人工补充 schema(新增,对齐 referral-tracker.md 的日记录字段聚合):

```json
{
  "schema_version": 1,
  "window": {"from": "...", "to": "..."},
  "affiliate": {"clicks": null, "registrations": null, "activations": null,
                 "trade_volume_usdt": null, "commission_usdt": null,
                 "coverage_note": "KuCoin 后台周聚合,归因窗口以后台口径为准"},
  "human_hours_total": 0,
  "content": [{"id": "safe-transfer-x-01", "channel": "x", "human_hours": 0.5, "effective_visits": null}],
  "notes": []
}
```

- `--assemble`(CI 内执行):从账本 checkout 读取本周各目录最新加密回执(search/、analytics/、cross-channel/、experiments/、x-metrics/、x-analysis/、feedback/)+ 本周 manual 密文 → 解密 → 映射填充 `validateWeeklyInput` 的 12 项指标与 coverage → 产出周报输入 JSON。映射规则固定并写测试:GSC 回执→search_clicks/impressions;CF 回执→site_visits/ai_referral_visits;X 分析→x_posts_published/x_link_clicks;manual→affiliate 三项+human_hours;某源回执缺失→null+missing,不阻断。
- `--render`:调用现有 `buildWeeklyReport` 渲染 Markdown,**加密写入账本 `reports/weekly/<ISO周>.md.enc`**,同时把不含数字的"结构摘要"(coverage 表 + 是否达到 30 访问门槛的布尔值 + 建议行)输出到 workflow 日志。

**新增 `.github/workflows/weekly-review.yml`**:schedule 周一 04:47 UTC(北京 12:47,在 03:37 feedback-link-evidence 之后留足缓冲) + workflow_dispatch;`vars.FEEEYE_WEEKLY_REVIEW == 'enabled'` 门控;artifact 上传加密周报,30 天保留。

**验收**:
- 空 manual 时周报仍生成,affiliate 全 null、coverage 标 missing,退出码 0;
- 任一来源回执 >7 天 → 该源降级 partial 并写入报告头部提示;
- `test_weekly_review.mjs` 覆盖映射、降级、密文往返、schema 拒绝非法字段。

### 阶段 2:复盘链路自检(第 2 周,约 0.5 天)

扩展 ops-health(或 weekly-review 前置步骤)新增 `--ledger-freshness`:用 GitHub API 检查账本分支 `search/、analytics/、cross-channel/、feedback/、x-metrics/` 各目录最近提交时间,>8 天 → 周报头部"复盘链路降级"告警 + workflow summary 标注;不自动重跑失败采集(重试属人工决策)。

**验收**:人为把某目录回执日期改旧,测试断言告警出现且周报不中断。

### 阶段 3:内容生命周期检查点通用化(第 2-3 周,约 1.5 天)

**新增账本目录 `content-registry/`(append-only)**:每条已发布内容一行 `{content_id, channel, landing_path, utm, published_at, checkpoints: [7d, 28d], status}`。

- X 帖:发布回执落账本时自动登记(改 `x_receipt_store.mjs`,一个 append);
- 站内内容(benchmark/教程/工具页):postdeploy-bilingual 通过后自动登记(deployment_manifest 已有 canonical 清单,取本次 diff 中新增/实质变更的 URL);
- 人工发布(YouTube/Reddit):周日仪式里用 `--stage-manual` 一并补登记。

**新增 `build/ops/content_lifecycle_review.mjs`**:每个到期检查点,从既有 GSC 页面级信号回执与 X 指标回抽取数 → 输出 `content_lifecycle` 区块并入周报:每条内容的 7d/28d 曝光/点击/出站、是否达到 30 有效访问门槛、是否进入"可比较"池。

**验收**:登记→到期→出现在周报;GSC 无该页数据时行内 null 不剔除。

### 阶段 4:下周提案(决策闭环出口)(第 3-4 周,约 1 天)

**新增 `build/ops/weekly_proposal.mjs`**,输入=本周周报 + topic_queue 候选 + page_opportunity_queue + feedback 修订计划 + 实验观察结果 + autonomous_analysis 决策(observe/hold/maintain/scale/stop,首次接入调度,只作建议字段),输出固定结构的「下周提案」区块附在周报尾部:

```
## 下周提案(自动生成,仅建议;选题与放大由人工确认)
- 主选题候选(≤5,来自 28 天聚合信号):…  ← 人只选 1
- 页面改进候选(已有页,不自动新建):…
- 反馈修订项(带证据链):…
- 实验状态:中文首页标题实验已冻结 X 天,距 ≥30 新曝光复盘还差 N 次
- 渠道效率(仅列达门槛项):…
- 自主引擎建议:hold(理由:…)
```

**验收**:提案字段全部可追溯到来源回执;无候选时输出"维持低频节奏"而不是编造;任何字段的"放大"建议都只引用 30 访问门槛,不出现新阈值。

### 阶段 5:趋势与漏斗(第 4 周,约 0.5 天)

- 周报追加「近 4 周滚动」表:从账本 `reports/weekly/` 读历史密文,列 12 项指标周环比箭头(仅展示,不自动结论);
- affiliate 漏斗区块:点击→注册→激活→交易量→佣金逐层转化率,数据全部来自 manual 补充,与站内匿名事件**不拼接**(沿用 analytics-measurement-plan 红线)。

**验收**:历史 <4 周时表格截断不补 0;漏斗层缺失显示"—"。

## 五、每周人工仪式(推广节奏的驾驶位)

复盘自动化不是取代人,而是把人的每周投入压缩到固定动作:

| 时点 | 动作 | 耗时 |
|---|---|---|
| 周日 21:00(北京) | 下载/解密上周周报 + 下周提案 → 填 manual 补充(affiliate 后台数 + 本周 human_hours + 内容行)→ `--stage-manual` 推账本 → 圈定 1 个主选题 → 批准下周分发计划 | 45-60 分钟 |
| 周一 12:47(北京) | 自动:采集批(02:17-03:37)→ 周报装配(04:47)→ 下周提案 | 0 |
| 周中 | 按批准的节奏执行分发:X 2-3 条(人工或原生排程)、双周 benchmark、社区 3-5 个回答 | 2-4 小时/周(内容制作) |
| 发布后 | 站内内容自动登记生命周期;人工渠道发布当周补登记 | 5 分钟/条 |

首个完整周期目标:**2026-10-25(周日)填首份 manual,10-26(周一)出第一份全自动周报**(周一采集批已持续运行,10-19 轮全部成功,装配器上线即有真实数据)。

## 六、总体验收(规划完成之日应满足)

1. 连续 4 周,每周一自动产出加密周报 + 下周提案,无人工拼数;
2. 12 项指标中凡有授权来源的,coverage 为 complete/partial;长期 missing 的只剩无授权的(如 Bing AI 导出),且已在 coverage.note 说明;
3. 每条"放大/维持/停止"建议可追溯到 30 访问门槛或 autonomous_analysis 的固定规则;
4. 公开仓库零私有数据(定期 grep 校验密文与明文数字);
5. 周报人工处理时间 ≤60 分钟(超出说明自动化覆盖不足,回到本规划迭代)。

## 七、明确不做(本规划边界)

- 不自动发布、不自动选题、不自动放大——提案只是提案;
- 不为周报购买任何新 API(X/YouTube 用原生统计人工录入 manual);
- 不把站内匿名事件与 affiliate 后台数据拼成用户级画像;
- 不用模型生成周报结论数字——所有数字来自回执或人工输入,模型只排版;
- 不在周报里补 0、补行业基准或推算值。

## 八、风险与应对

| 风险 | 应对 |
|---|---|
| GitHub 定时任务延迟/丢弃(蓝图已记录) | 非整点 cron + ledger-freshness 告警 + workflow_dispatch 手动补跑 |
| 周一采集批某环节失败 → 周报降级 | 设计即 fail-open:missing 不阻断,报告头部明示降级 |
| manual 补充连续缺失 → affiliate 指标长期 null | 周报连续 2 周无 manual 时在提案区提示"漏斗盲驾",不估算 |
| FEEEYE_OPS_DATA_KEY 轮换 | 密文文件名带版本位(复用现有 `__v2` 模式),旧密文保留不重写 |
| 规划与实现漂移 | 每阶段落地时按项目惯例补 `docs/automation-phaseN-*.md` 实施记录 |

## 九、工作量与顺序汇总

| 阶段 | 内容 | 估时 | 依赖 |
|---|---|---|---|
| 0 | 合并 PR #35、X 回执对账、文档校准 | 0.5 天 | 人工(X 后台) |
| 1 | weekly_review.mjs + weekly-review.yml + 测试 | 1 天 | 阶段 0 |
| 2 | ledger-freshness 自检 | 0.5 天 | 阶段 1 |
| 3 | content-registry + 生命周期检查点 | 1.5 天 | 阶段 1 |
| 4 | weekly_proposal + autonomous_analysis 接入 | 1 天 | 阶段 1、3 |
| 5 | 4 周趋势 + affiliate 漏斗 | 0.5 天 | 阶段 1,满 4 周数据后有价值 |

合计约 5 个工作日的工程量,分 4 周落地;每阶段独立可验收、独立可回滚(删除工作流即回滚,不留残留状态)。
