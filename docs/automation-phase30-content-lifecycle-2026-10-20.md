# 自动化运营第三十阶段:内容生命周期检查点

日期:2026-10-20。状态:已实现并上线。对应 `docs/operations-review-automation-plan-2026-10-20.md` 阶段 3。

## 背景

阶段 28/29 之后,周报能自动出、链路能自检,但「每条内容发布后效果如何」仍无系统记录——X 帖有 24h/7d/28d 检查点,站内内容(benchmark/教程)和人工渠道内容(YouTube/社区)没有。本阶段把生命周期检查点通用到全渠道,并并入周报。

## 设计决策:派生优先于登记

- **X 帖不登记**:发布回执(`x/*.json`)本身就是完美的 append-only 登记表(发布时间、地址、幂等键齐全),生命周期直接从回执派生,不复制数据。
- **站内内容自动登记**:postdeploy-bilingual(双语校验通过后)把部署清单(`deployments/<时间戳>-<build_id12>.json`,manifest + 时间戳信封)落到账本,与最近一次不同树的清单做 diff,新增或实质变更(sha256 变)的**编辑性页面**(`/research/`、`/learn/`,en+zh)以部署日为发布日登记进 `content-registry/<content_id>.json`。首跑无基线 → 全部编辑页按当日登记(追溯基线,合理)。
- **只登记编辑页**:where-to-buy/币页/国家页每日随数据快照变化,登记它们只会制造噪声;工具页稳定,暂不登记。
- **人工渠道手动登记**:`content_registry.mjs --register --input FILE --store DIR`(YouTube/社区发布后补一条)。

## 新增

- `build/ops/content_registry.mjs`:严格 schema 校验、写一次不可改(同内容幂等、异内容拒绝)、URL 归一化(去 .html/尾斜杠,匹配 GSC 行变体)、部署差异→登记推导。
- `build/ops/content_lifecycle_review.mjs`:对登记表 + X 回执派生项,7d/28d 检查点到期时取数——站内查 GSC 页面信号(如实标注 trailing 28 天口径;页面不在导出中 = 窗口内零搜索曝光),X 查指标快照;YouTube/社区标记 `manual`(效果由人工补充提供,不自动抓取)。未到期 `pending`、到期无数据 `due_unreported`,不估算。
- `build/ops/ledger_reads.mjs`:共享读取助手(避免 weekly_review ↔ lifecycle 循环依赖)。
- 周报新增「内容生命周期」区块与 `lifecycle_items`/`lifecycle_due` 汇总字段;门槛对照:站点行 GSC 点击、X 行 url_clicks,对照渠道政策的「单条 ≥30 有效访问」。
- `postdeploy-bilingual.yml`:`contents: read→write`,新增账本 checkout(加入 `x-receipt-ledger` 并发组)、部署清单落账本、编辑内容登记、仅提交 `content-registry/` 与 `deployments/`。
- `test_content_lifecycle.mjs` 接入 validate-site 与 validate_local。

## 边界

- 登记/部署记录均明文(公开 URL 与哈希,无私有数据);效果数据仍在加密回执里,评审时现查不落登记表。
- postdeploy 的登记步骤失败会显式红掉工作流(不静默);不影响站点部署本身(Cloudflare 独立部署)。
- 同日重复部署同内容 → content_id 相同幂等;次日的实质再变更 → 新 content_id(以再变更日为新观察起点)。
