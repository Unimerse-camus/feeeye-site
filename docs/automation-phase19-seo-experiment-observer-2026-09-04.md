# FeeEye 自动化运营第十九阶段：SEO/GEO 实验冻结与加密观察

日期：2026-09-04。本阶段先修复一个机器状态与真实部署回执的冲突：中文首页摘要实验已于 2026-09-02 06:56:51 UTC 验证上线，但登记文件仍标记为未部署候选。现已改为 `observing`，并绑定生产提交、build、验证时间和 2026-09-30 最早复盘日期。

`seo_experiment_observer.mjs` 只读取 `automation-receipts` 中已加密的 GSC 28 天最终页面聚合快照，不调用 Google、Cloudflare 或 X API。当数据窗口尚未完全位于部署后，状态只能是 `waiting_for_complete_postdeploy_window`；到达复盘日期后，若页面未出现或曝光少于 30，只能 `extend_observation`；只有完整窗口且样本门槛达标才会 `ready_for_review`。

基线、观察指标和差异始终使用 AES-256-GCM 加密。公开日志不包含 URL、点击、曝光、CTR 或排名。冻结期间禁止重叠页面实验；所有状态都保持自动改页、自动发布和启动下一实验为 `false`。

定时工作流只在 `FEEEYE_EXPERIMENT_OBSERVER=enabled` 时于每周一 02:57 UTC 运行；该变量当前不应创建，手动验证也不会修改网站内容。
