# FeeEye 自动化运营第十一阶段：X单帖验收与永久回执分支

日期：2026-09-03。状态：本地实现，未部署、未创建`automation-receipts`分支、未设置Live Trial变量、未切换shadow策略、未发送帖子。

## 四重关闭门禁

`x-live-trial.yml`只支持手动运行固定的`transfer-en`教育帖，并且必须同时满足：

1. 输入精确确认词`PUBLISH_TRANSFER_EN_ONCE`；
2. 仓库变量`FEEEYE_X_LIVE_TRIAL=enabled`；
3. 独立非部署分支`automation-receipts`已经存在且可读取；
4. `autonomy-policy.json`已经单独改为autonomous、总发布开启、X渠道开启。

当前第2、3、4项均不成立，因此工作流即使被误点也无法发帖。

## 执行顺序

工作流先签出main和永久回执分支，再完成全仓验证、等待精确部署、八组双语线上检查、生成固定单帖请求，并查询幂等键是否已有回执。已有回执时停止，不访问X；没有回执且全部门禁开启时，才把四项OAuth Secret交给官方API执行器。

成功或对账确认后的回执通过排他创建写入`automation-receipts/x/<idempotency>.json`，只提交到非部署分支。网络结果未知且近期帖子无匹配时不会生成回执，也不会自动重试。

## 运行时升级

新工作流采用官方当前v7的`actions/checkout`、`actions/setup-node`和`actions/upload-artifact`，Node版本为24。现有工作流将在同一PR中升级对应major版本，以消除Node 20运行时弃用警告；版本依据来自各官方GitHub release页面。

- https://github.com/actions/checkout/releases
- https://github.com/actions/setup-node/releases
- https://github.com/actions/upload-artifact/releases
