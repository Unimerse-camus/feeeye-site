# X单帖验收授权边界

日期：2026-09-03。

账号所有者已明确授权发布且仅发布冻结的`transfer-en`教育帖，用于验证FeeEye官方X API写入、公开可见性、费用、重复对账与永久回执。授权不包括第二条帖子、定时发布、回复、提及、私信、点赞、转发、删除或其他渠道发布。

本次冻结正文来自`ops/automation/campaigns/x-launch-2026-08-31.json`：

> Before sending crypto: check the asset, receiving network, address and any required memo. A familiar token name does not make every network compatible.
>
> https://feeeye.com/learn/safe-crypto-transfer?utm_source=x&utm_medium=social&utm_campaign=feeeye-launch

试运行使用独立`x-live-trial-policy.json`，只启用X渠道；全局`autonomy-policy.json`保持shadow。运行前必须精确匹配线上部署、双语检查、目标账号、5美元账单上限、关闭自动充值、固定正文和永久回执分支。完成后仓库变量必须恢复为`disabled`。
