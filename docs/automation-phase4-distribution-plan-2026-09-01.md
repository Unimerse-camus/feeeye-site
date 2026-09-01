# FeeEye 自动化运营第四阶段：免费渠道分发计划与复盘节点

日期：2026-09-01。状态：本地候选实现；默认不发帖、不点赞、不回复、不私信、不提交IndexNow。

## 解决的断点

第三阶段已能验证内容、审批状态和生产部署，但“通过验证的内容如何进入一个有限频次、可追踪、不会误发的执行队列”仍依赖手工拼接。本阶段新增`build/ops/distribution_plan.mjs`，把已验证的生产版本、单一账号语言和三条X草稿组合成一个本地待审执行包。X只是首个已实现模块，不是FeeEye的唯一或最高优先级渠道；多渠道依据见`docs/crypto-tools-channel-research-2026-09-01.md`和`ops/automation/channel-policy.json`。

执行包不是发布许可，也不调用X网页或API。它只回答：准备发什么、落到哪个页面、何时由人手动/原生排程、如何防止重复，以及何时回看结果。

## 强制约束

- 只接受`https://feeeye.com`的已验证生产回执，且必须包含64位build ID和40位Git source revision。
- 计划绑定campaign内容哈希、部署build、Git修订和具体排程；任一变化都会使旧计划失效。
- 一个计划只允许英文或中文其中一组，不允许同一账号默认双语重复发布。
- 每条草稿只能有一个FeeEye链接，且只能使用注册的`x / social / feeeye-launch` UTM组合。
- 三条内容按第0、2、5天排列，七天内最多三条；这是低频工程上限，不是“最佳发布时间”结论。
- 每条内容生成独立幂等键，并生成发布回执、24小时、7天、28天四个观察节点。
- `publishing_enabled=false`固定保留；计划器没有外部发布、自动互动或账号凭据能力。

## 使用方式

先用`verify_deployment.mjs`生成生产验证回执，再生成本地计划：

```sh
node build/ops/distribution_plan.mjs \
  --locale en \
  --start-at 2026-09-03T01:30:00.000Z \
  --verification ops/automation/working/production-verification.json \
  --out ops/automation/working/feeeye-launch-en-plan.json
```

输出目录已被Git忽略。命令会拒绝覆盖已有文件，避免人工审阅结果被静默替换。

## 人工执行边界

1. 运营者逐条确认正文、图片、落地页、披露和目标账号。
2. 获得对具体内容的批准后，使用X原生排程或人工发布。
3. 保存真实帖子URL；状态不确定时先核对，不重复发送。
4. 到24小时、7天、28天时录入聚合结果和人工耗时；缺失保持`null`。
5. 只有每渠道至少30个有效访问且有两个可比较样本时，周报才给排序参考；不自动提高频率。

下一阶段才考虑把真实发布回执与周报输入连接起来。任何X API、自动发帖或自动互动仍需单独的预算、权限和发布授权。

## 多渠道位置

首个28天预注册组合为搜索/网站40%、YouTube 20%、X 15%、问题社区20%、GitHub/Product Hunt 5%。X计划器仅负责15%的执行模块；Telegram、Discord和Newsletter在出现重复需求、具备管理时间并重新获批前保持延后。
