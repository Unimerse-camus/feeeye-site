# FeeEye 自动化运营第七阶段：中英文发布前后自校验

日期：2026-09-02。状态：本地候选实现；不自动翻译、修复或发布。

## 原则

中英文不是两套独立内容。两种语言必须绑定同一主题、风险等级、来源集合、内容复核日期和发布构建。程序验证结构与事实锚点，人工仍负责语义、语气和地区适用性。

## 发布前

`bilingual_parity.mjs`同时生成中英文多渠道简报并比较：

- 主题、分类与风险等级；
- 来源URL、构建ID和内容复核日期；
- 学习目标、分镜章节和每节事实点数量；
- 社区清单、风险警示、规则要求；
- 24小时、7天、28天衡量节点；
- YouTube上传、社区回帖和总发布开关保持关闭。

失败时`status=failed`、`publication_allowed=false`，不会自动选择一种语言覆盖另一种。

## 发布后

main合并后，`postdeploy-bilingual.yml`自动：

1. 用该Git提交重新构建候选；
2. 从Cloudflare Pages官方生产别名读取部署，直到release的Git revision和build ID同时匹配；
3. 获取8组中英文学习页；
4. 核对HTTP、canonical、双向hreflang与x-default；
5. 核对Article日期、原始来源集合、FAQ数量、章节数量和高风险标记；
6. 保存28天GitHub artifact回执。

线上构建变化、任一语言404、来源不同、FAQ不同或hreflang错误都会让工作流失败，并令`distribution_allowed=false`。这属于发布后告警和社交分发门禁，不能撤销已经发生的Cloudflare部署；需要通过新修复PR恢复。

GitHub托管Runner访问`feeeye.com`会被Cloudflare自定义域名策略返回403，因此自动校验从同一Pages项目的生产别名`feeeye-site.pages.dev`读取字节，但仍强制页面canonical和hreflang指向`https://feeeye.com`。独立健康检查继续验证用户域名本身。

`distribution_plan.mjs`现在强制要求这一回执。中英文校验状态不是`verified`、存在任一失败项，或build/revision与生产验证不同，后续X分发计划无法生成。

## 能力边界

- 程序能证明结构和事实锚点一致，不能证明两段自然语言语义完全等价。
- 不使用模型自动重译线上内容，避免静默改变已经审批的表达。
- 地区法律、KYC和费率差异仍需人工按语言受众复核。
- 英文发布成功不代表中文自动获批，反之亦然。
