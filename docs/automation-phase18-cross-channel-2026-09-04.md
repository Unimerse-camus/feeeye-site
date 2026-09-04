# FeeEye 自动化运营第十八阶段：跨渠道加密分析

日期：2026-09-04。本阶段仅读取`automation-receipts`中已加密的Cloudflare和GSC快照，不再调用Cloudflare、Google或X API。

分析严格保留两个不同口径：Cloudflare仅汇总最近7个完整UTC日；GSC保留原最终28日页面聚合窗口。两者不会被伪装成同一“周”指标，也不构造用户级漏斗。

加密报告包含站内访问、页面浏览、六类来源、GSC 28日点击/曝光以及最多5个已有页面审查候选。因为当前没有内容级访问归因，报告必须明确记录`content_level=unavailable`，不得将总访问归因给X帖子或某一页面。

少于30次最近7日访问时保持`hold`；样本达标且存在已有页面候选时只能进入`prepare_existing_page_experiment`。自动发布和自动增加频率均为`false`。完整报告继续使用AES-256-GCM加密，公开日志不包含指标值、URL或候选详情。

工作流只在`FEEEYE_CROSS_CHANNEL_ANALYSIS=enabled`时每周一02:37 UTC运行，手动运行不受该变量限制。
