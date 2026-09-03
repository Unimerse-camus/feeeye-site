# FeeEye 自动化运营第十二阶段：X效果检查点

日期：2026-09-03。状态：本地实现；定时变量未设置，本轮不访问X。

## 数据边界

`x_metrics_collector.mjs`只读取`automation-receipts`中已发布的FeeEye帖子回执，并为24小时、7天、28天三个检查点保存帖子级聚合指标。它不读取关注者名单、点赞用户、回复正文、私信、用户名列表或其他个人数据。

公开指标包括曝光、点赞、回复、转发、引用和收藏；OAuth用户上下文可为30天内的自有帖子提供总互动、链接点击和资料页点击。API未返回的字段保存为`null`并列入`missing_fields`，不解释为0。

## 调用与成本控制

- 没有到期检查点时不调用X API。
- 每个回执每次只处理最早的一个未完成检查点。
- 每次最多处理3个帖子；先执行一次精确账号检查，再逐帖读取。
- 快照使用`FEEEYE_OPS_DATA_KEY`执行AES-256-GCM认证加密后，以排他创建写入`automation-receipts/x-metrics/<idempotency>/<checkpoint>.json.enc`；公开分支不出现指标明文，已存在时跳过。
- Live Trial与指标采集共享`x-receipt-ledger`并发锁，避免同时推送回执分支。

## 工作流状态

`x-metrics.yml`支持手动运行和每日08:07 UTC（北京时间16:07）检查，位于首帖15:48检查点之后约19分钟。定时执行必须存在仓库变量`FEEEYE_X_METRICS=enabled`和32字节加密密钥Secret；缺少密钥会在任何X API调用前失败。发现公开分支隐私边界后，变量已于2026-09-03改回`disabled`，待加密版本部署和密钥配置后再启用。

官方依据：

- https://docs.x.com/x-api/fundamentals/metrics
- https://docs.x.com/x-api/posts/lookup/integrate
- https://docs.x.com/x-api/getting-started/pricing
