# FeeEye 自动化运营第三阶段：审批、发布候选与效果闭环

日期：2026-09-01。状态：本地实现与测试通过；未推送、未部署、未提交IndexNow、未发X内容、未启用定时监控。

## 本阶段解决的问题

上一阶段能够生成稿件并检查来源，但还不能回答：谁审过哪一个版本、批准的是哪个账号和语言、线上是否为同一构建、搜索引擎应该收到哪些变化URL、发布是否有真实回执、周报缺数据时如何处理。

本阶段将这些问题变成可拒绝的程序契约。X官方API仍未启用；状态机记录不等于自动发帖能力。

## 1. 内容审批状态机

入口：`build/ops/workflow_state.mjs`。

状态主线：

`draft → evidence_ready → reviewed → approved → scheduled → publishing → published → verified`

异常状态：`blocked`、`expired`、`failed`、`needs_reconciliation`。

控制点：

- 初稿绑定campaign、目标账号`FeeEyeOfficial`、单一语言、3条帖子与内容SHA-256。
- `evidence_ready`需要落地页和附件均通过；费率内容还应先通过单独的来源检查。当前首批品牌教育稿不包含具体平台费率。
- `reviewed`必须标记人工审核，并绑定原内容哈希；改一个字符后旧审核失效。
- `approved`必须由明确批准对象同时绑定账号、语言、帖子ID、内容哈希和时间。测试脚本使用合成批准验证逻辑，不代表真实稿件获批。
- 排程最长30天，只接受`manual_or_native`。X API没有预算和权限，不能借网页机器人代替。
- 进入`publishing`需另一个单次发布会话显式开启；当前仓库没有发布模块，配置仍为false。
- `published`必须逐条保存符合`x.com/FeeEyeOfficial/status/<id>`的回执；状态未知进入`needs_reconciliation`，不能盲目重发。

生成待审初稿示例（只写本地ignored目录）：

```sh
node build/ops/workflow_state.mjs --locale en --write-draft \
  --out ops/automation/working/feeeye-launch-en.json
```

脚本目前只提供安全初稿入口；审核、批准和外部发布不提供可绕过的人机CLI捷径。

## 2. 确定性部署候选

`generate.mjs`现在生成`dist/release.json`：

- `build_id`覆盖整个公开构建目录：HTML、工具、数据、资源、headers、sitemap、robots和404；仅排除它自身。
- 在GitHub/Cloudflare构建环境存在有效提交SHA时，另记录`source_revision`。
- `release.json`不缓存，便于部署后读取。

`deployment_manifest.mjs`为386个canonical页面保存本地文件路径和SHA-256，并可与上一版manifest比较，输出`created/changed/deleted/url_list`。同一构建的增量为空，首次候选才包含全量URL。

`.github/workflows/ops-release-candidate.yml`只有手动入口：重新运行全套验证，生成候选并作为14天审阅artifact保存。它不合并、不推送、不部署。

## 3. 部署后验证与IndexNow

`verify_deployment.mjs`先读取线上`release.json`，要求build ID、页面数以及存在时的source revision与候选一致，再检查首页、学习中心、总成本、安全转账和计算器等关键路径。

只有匹配的验证回执才能交给`indexnow_delta.mjs`。后者仅生成增量payload和哈希，`submitted=false`。删除URL也进入变化列表，以便搜索引擎更新状态。

旧的全量提交旁路已关闭：`submit_indexnow.mjs --submit`现在必须同时提供delta、匹配的部署验证以及新的本地回执路径；提交前会再次读取线上release，若构建已变化则停止。网络受理后记录`accepted_not_indexed`，不声称已收录。该命令仍会产生外部状态，只有取得单独授权后才可运行；本次没有运行。

因此当前安全顺序是：

`候选 → 人工批准部署 → 线上同版本验证 → 增量payload → 另行授权提交 → 社交发布`

本阶段没有获得部署或IndexNow提交授权，未执行后四步。

## 4. 健康检查

`health_check.mjs`只读检查7个入口：中英首页/学习页、计算器、sitemap、robots和release。输出每项HTTP状态、基本内容断言及失败数；不知道的错误不替换成旧成功。

`.github/workflows/ops-health.yml`提供：

- 手动运行：输入HTTPS站点地址。
- 每日北京时间09:17的候选排程。
- 排程默认被仓库变量锁住；只有将`FEEEYE_OPS_MONITORING=enabled`后才实际运行。此次未创建该远程变量。

工作流失败会显示为GitHub Actions失败；尚未配置额外邮件、Slack或付费告警服务。

## 5. 隐私最小化周报

输入示例：`ops/automation/metrics/weekly-input.example.json`；生成器：`weekly_report.mjs`。

输入只接受一周窗口、四个数据源覆盖状态、固定聚合指标和按内容汇总的有效访问/人工小时。不接受额外字段，因此邮箱、钱包、个人查询或用户ID不能混入该结构。

- `null`表示缺失，报告显示“未提供”，不转换为0。
- 数据源必须写明`complete/partial/missing`、截止日期和说明。
- 每项内容不足30个有效访问时不做效率放大；30只是描述性观察门槛，不是统计显著性。
- 数据不足时结论固定为维持低频，不自动加大发帖量。
- 私有报告目录已忽略，不进入公开仓库。

示例命令：

```sh
node build/ops/weekly_report.mjs \
  --input ops/automation/metrics/weekly-input.example.json
```

## 6. 测试证据

`node build/validate_local.mjs`通过。第三阶段专门覆盖：

- 跳级审批、机器人冒充人工、旧内容哈希、错账号/语言/帖子、超30天排程。
- 发布总开关关闭、缺失/错误帖子回执、公开可见性未确认。
- manifest无变化、新增、修改和删除URL。
- 线上build/revision不匹配和关键页面失败。
- 未验证部署回执生成IndexNow负载。
- 7个入口全部失败的健康报告。
- 周报额外私有字段、未知值、样本不足与具备两个可比较样本。

全套输出仍明确：IndexNow为dry run；没有部署或发帖。

## 7. 下一实施门槛

1. 审阅当前本地所有未提交变更，决定是否形成一个候选提交。
2. 核实GitHub main保护和Cloudflare构建命令；不能仅因CI文件存在就声称部署被门禁保护。
3. 若批准部署，先推候选、等待Cloudflare、获取同build回执；再请求增量IndexNow权限。
4. X首批内容需选择一种账号语言并逐条批准。当前横幅已上线，但简介仍空、帖子数仍为0。
5. 只有明确批准监控后，才在远程仓库设置`FEEEYE_OPS_MONITORING=enabled`。

2026-09-01远程审计及获批整改已完成，详见`docs/deployment-readiness-audit-2026-09-01.md`：Cloudflare对main自动部署；GitHub main现已要求PR和`validate`且禁止绕过。Cloudflare普通Text变量已删除，CoinGecko Key已轮换并通过GitHub手动工作流验证。

为适配main保护，行情刷新工作流已在候选中改为专用分支PR模式，移除对main的直接push和普通代码push触发。
