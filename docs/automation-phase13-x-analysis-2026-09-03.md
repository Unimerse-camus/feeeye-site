# FeeEye 自动化运营第十三阶段：X指标自动分析

日期：2026-09-03。状态：本地实现；分析变量未设置，不调用X，不发布内容。

## 分层输出

`x_metrics_analysis.mjs`只读取`automation-receipts/x-metrics/`中的帖子级聚合快照。事实层保留帖子URL、检查点、观察时间、聚合指标和缺失字段；决策层只使用预注册规则，不读取回复正文、用户列表、私信或个人资料。

## 预注册决策

- 没有指标：`observe / no_metric_snapshots`。
- 只有24小时或7天：`observe / waiting_for_28d_checkpoint`。
- 28天样本少于3条：`hold / insufficient_28d_sample`。
- 至少3条但曝光或链接点击缺失：`hold / required_metrics_missing`。
- 至少3条且X指标完整，但缺少FeeEye下游有效访问：`hold / downstream_effective_visits_required`。

任何情况均固定`cadence_multiplier=1`和`automatic_publish_allowed=false`。点赞、曝光或X链接点击不能单独触发加大发布频率；未来只有与站内有效访问结合并达到既有样本门禁后，才允许另行评估maintain或scale。

## 自动工作流

`x-analysis.yml`在成功的`x-metrics`工作流之后触发，或可手动运行。自动触发要求`FEEEYE_X_ANALYSIS=enabled`。工作流不加载任何X Secret、不访问X API；它使用`FEEEYE_OPS_DATA_KEY`解密指标并把确定性分析重新以AES-256-GCM密文追加到`automation-receipts/x-analysis/`，30天证据产物同样只上传密文。
