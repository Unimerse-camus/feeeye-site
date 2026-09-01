# FeeEye 自动化运营第五阶段：选题队列与多渠道内容简报

日期：2026-09-01。状态：本地候选实现；不抓取社交平台、不自动选择选题、不发布内容。

## 流程

`28天聚合信号 → 最多5个候选 → 人工选择1个 → SEO/GEO + YouTube + 社区统一简报 → 人工编辑/审批 → 网站PR与各平台人工发布`

## 隐私最小化选题队列

`topic_queue.mjs`只接收8个已注册学习主题的聚合计数：搜索曝光、点击、AI引用和人工分类的问题数量。输入不允许原始搜索词、帖子正文、用户名、钱包地址或用户标识，也不提供可被滥用的自由文本备注字段；覆盖说明只能使用固定状态代码。

- 窗口固定28天，避免用不同周期的数据直接比较。
- 来源覆盖必须写明complete、partial或missing；缺失保持null。
- stale或blocked证据进入hold，不因需求量高而绕过来源复核。
- 先按真实分类问题数，再按搜索曝光、点击和AI引用排序；这是运营队列规则，不是流量预测模型。
- 自动化最多返回5个候选，必须由人只选择1个主选题。

示例：

```sh
node build/ops/topic_queue.mjs \
  --input ops/automation/metrics/editorial-signals.example.json \
  --out ops/automation/working/topic-queue.json
```

## 一份事实，多种表达

`multichannel_brief.mjs`从现有已审校学习内容生成单一语言的本地待审包：

- SEO/GEO：现有canonical页、答案摘要、意图和八项质量检查；默认实质更新现有页，不新建关键词变体页。
- YouTube：3–6分钟标题、开场、学习目标、分镜、工具演示和教育性结尾；不自动上传。
- 社区：直接答案、支持要点、清单、风险警示和原始来源；FeeEye链接可选，链接时必须披露关系；不自动回帖。
- 衡量：真实发布回执及24小时、7天、28天观察节点。

包绑定当前构建ID、内容复核日期、原始来源和内容SHA-256。正文、来源或网站构建变化后，旧包校验失败。

示例：

```sh
node build/ops/multichannel_brief.mjs \
  --topic safe-crypto-transfer \
  --locale en \
  --out ops/automation/working/safe-transfer-en-brief.json
```

## 尚未自动化的部分

- GSC、Bing AI和社区问题数据仍需授权导出或人工聚合；不存在数据时不生成假候选。
- YouTube录屏、字幕校对、缩略图和Studio上传由人完成。
- Reddit、CMC Community等必须先看版规和真实问题，不能用统一模板批量回复。
- 选题入选不等于事实获批、网站部署许可或社交发布许可。
