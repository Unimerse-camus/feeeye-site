# 自动化运营第一阶段：本地草稿流水线

状态：已实现本地生成与校验；**未部署、未开新定时任务、未连接社交账号、未公开发布**。

## 一条命令验收

在repository目录运行（Node 20或更高版本）：

```sh
node build/validate_local.mjs
```

这会检查交易所数据、提币报价、生成网站、验证统计隐私、测试内容包与失败场景，以及IndexNow负载的**dry run**。不会联网刷新费率、提交搜索引擎、推送Git或发布社交内容。会重建可再生成的dist目录。

## 内容包

```sh
node build/generate.mjs
node build/ops/build_content_pack.mjs
node build/ops/validate_content_pack.mjs <上一条输出的完整目录>
```

产物在本地`ops/automation/generated/<版本>-<内容指纹>/`，已忽略、不进入Git或站点输出。包括中英HTML、SVG、CSV、原始事实JSON、中英各3条X草稿、视频脚本、审核清单和manifest。HTML采用网站绝对资产路径，完整预览应访问本地dist服务，不直接双击内容包HTML。

可选PNG使用已经安装且确认可信的sharp，不自动安装任何依赖：

```sh
FEEEYE_SHARP_MODULE=/absolute/path/to/sharp/dist/index.cjs node build/ops/build_content_pack.mjs --png
```

模块入口以已安装sharp的package.json为准，不同版本路径可能不同。无PNG的包会标记`png_ready=false`，X草稿的PNG引用是待渲染项，不能直接发布。带PNG的包标记true。重跑同内容返回同目录；有人工改动时拒绝覆盖，保留审阅证据。

## 事实与审批边界

- 当前快照迁移自2026-08-27既有记录，不是真实成交。8月31日新做的官方来源审阅单独保存于reviews目录，未覆写原快照或其来源日期。
- `source_reviewed_at`为来源记录日期，`editorial_updated_at`为网页口径修正日期，`effective_at`未知时留null。行情字段单独记录成功获取时间，失败不得改日期。
- 禁止直接覆写旧事实文件：费率变化应新建快照文件/版本，保存来源、地区、产品和档位，再切换生成器入口并重审所有产物。
- 网页、图、CSV、结论和视频脚本同源；费率上限保留为上限，不计算确定余额。
- manifest记录事实与每个文件SHA-256，用于一致性和篡改检查，**不是人工批准签名**。修改内容后重建、重新审核；不能靠手改manifest获得许可。
- 配置默认关闭所有发布渠道；脚本没有发布接口，不读取社交账号或后台Token。
- 现阶段只有`draft`状态和审核材料，完整审批状态机、部署回执、去重发布与周报工作流仍未实现。

## 已修复与待办

已修复：行情刷新伪更新费率日期、可变费率与写死结论不同步、“实测”错误口径、上限对应确定余额、所有页面每日伪更新sitemap、图表和统计脚本缓存版本、将互动等同任务完成、任意UTM文本进入事件。

sitemap只给有明确编辑日期的两张benchmark页输出lastmod，其余暂省略，不伪造日期。图表及analytics/learning-nav使用内容指纹路径，其余assets改为重验证。旧无版本资产仍保留供旧链接访问，不当作新分享图。

验证工作流已加入内容包测试；现有行情刷新工作流候选修改及rebase后增加检查。**这不等于GitHub main已设置保护，也不等于Cloudflare部署已被审批门禁控制。**本轮未改变远程设置。

后续发布前必须：

1. 审阅本地变更；核验当前官方费率，或明确只发布历史研究。
2. 核实远程main分支保护、允许推送者及Cloudflare部署配置，避免绕过CI。
3. 获得部署授权后发布，确认线上版本和资源，再做增量IndexNow提交。
4. 确认社交账号并批准最终稿，人工发布/原生排程；记录最终帖子URL。
5. 再接入健康巡检、来源差异队列及只读效果周报。自定义事件接收端未接通前不报告任务完成率。

## 第二批：来源审阅与推广拦截

```sh
node build/ops/source_review.mjs
node build/ops/source_review.mjs --require-current
```

第一条只读输出覆盖情况；第二条若缺证据、存在口径差异、费率不匹配、观察日期在未来或超过内部7天复核窗口，则退出码为2。默认不联网、不会补造来源、不会更新费率。测试通过只证明检查逻辑正确，不代表推广获准。

8月31日审阅结果：4项限定口径有公开支持；Binance仅有官方教学典型值佐证，OKX存在欧洲账户条件差异，Coinbase旧数值上限未在当前公开帮助页得到确认。新包增加source-review.json/.md、readiness.json与review_hash，明确promotion_hold。旧包缺新审阅版本时校验拒绝通过，应重新生成，不能修改旧manifest绕过。

有上述口径问题时，旧对比图不进入新一轮推广；先修正范围并重审。另有campaigns/x-launch-2026-08-31.json提供不引用具体平台费率的品牌介绍和学习导航草稿：中英各3条，默认选定一种账号语言，不自动双语重复发布。账号简介与横幅同样仍待用户选用。

本批未实现完整发布审批状态机、后台报表读取或定时抓取；没有开启任何新排程。后续必须把--require-current接入实际发布前流程，当前不存在可被该开关自动启动的发布模块。

## 第三批：审批、部署验证、健康与周报

完整说明见`docs/automation-phase3-workflow-2026-09-01.md`。新增：

- `workflow_state.mjs`：内容哈希绑定的审批状态机；当前没有外部发布模块。
- `deployment_manifest.mjs`：确定性build、canonical页面哈希与URL差异。
- `verify_deployment.mjs`：部署后同版本和关键页面检查。
- `indexnow_delta.mjs`：仅在匹配验证回执后生成增量payload；不提交。
- `health_check.mjs`：7个公开入口只读检查。
- `weekly_report.mjs`：固定聚合字段、缺失不记0、私有报告不入库。

新增GitHub工作流均不自动发布：release candidate只能手动运行；health排程由未设置的仓库变量锁住。本地添加文件不等于远程工作流已启用。

## 第四批：低频分发计划与观察节点

完整说明见`docs/automation-phase4-distribution-plan-2026-09-01.md`，渠道依据见`docs/crypto-tools-channel-research-2026-09-01.md`。`channel-policy.json`把首个28天免费组合预注册为搜索、YouTube、X、问题社区和开发者/发布渠道；X只占候选投入的15%。`distribution_plan.mjs`是首个渠道执行模块，只在存在匹配生产版本的验证回执时生成本地待审计划：单一账号语言、七天最多三条、注册UTM、内容/部署哈希、幂等键，以及发布回执、24小时、7天、28天复盘节点。

该计划仍固定`publishing_enabled=false`，不会操作X、自动互动或提交搜索引擎。所有输出只能写入已忽略的`ops/automation/working/`，真实发布必须另行审批并由人工或平台原生排程完成。

## SEO + GEO

完整说明见`docs/seo-geo-operations-2026-09-01.md`。全站生成后运行`seo_geo_audit.mjs`，验证canonical、三组hreflang、站点实体、文章来源、FAQ字段和OAI-SearchBot规则。周报同时接受传统搜索、AI聚合引荐和Bing AI引用指标；没有授权导出时保持缺失，不估算或编造。

## 第五批：选题与统一多渠道简报

完整说明见`docs/automation-phase5-editorial-pipeline-2026-09-01.md`。`topic_queue.mjs`只使用28天聚合计数生成最多5个候选，原始查询、帖子和个人信息禁止进入输入；选题仍需人工选择。`multichannel_brief.mjs`把已审校主题转换为SEO/GEO更新要求、YouTube分镜和社区回答材料，绑定构建、来源、复核日期和内容哈希，所有外部操作保持关闭。
