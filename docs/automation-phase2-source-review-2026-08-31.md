# FeeEye 第二批：X横幅、官方费率复核与推广前检查

观察日期：2026-08-31。执行范围：公开官方网页、本地代码与素材；未访问交易账户、未下单、未部署、未发帖。

## 1. 横幅

`assets/social/x-header-v1.png`，2172×724，3:1，约1.2MB。使用imagegen技能的内置生成工具完成，保留蓝绿品牌方向与左下头像避让空间，逐项检查英文文字。生成提示词记录于`docs/x-header-v1-generation.md`。X推荐尺寸为1500×500；本图保持相同比例，上传时仍需检查裁切预览。[X官方说明](https://help.x.com/en/managing-your-account/how-to-customize-your-profile)

## 2. 本次复核结论

**不能把旧版七平台对比直接标成“今日已全部核验”并开始推广。**四项能在明确范围内复核数值，另外三项仍缺正式费率表、存在适用范围差异或需账户预览。下面的“确认”只针对该公开口径，不代表个人报价、平台准入或投资推荐。

| 平台 | 核验结果 | 运营处理 |
|---|---|---|
| Binance | 官方教学文列典型现货吃单费0.10%；正式费率页返回空表 | 只作佐证，暂不升级为当前账户/地区费率确认 |
| OKX | 标准组普通档0.10%；欧洲未开X-Perps账户普通档0.35%，已开账户0.10% | 必须按地区与账户条件拆分，暂停统一费率宣传 |
| KuCoin | VIP0 Class A吃单0.10%；B、C不同 | 明确限定Class A，不推广为全部币种费率 |
| Bybit | VIP0普通币币现货吃单0.10% | 保留地区差异提示，排除法币对与特殊区 |
| Bitget | 官方帮助页基础现货吃单0.10% | 不使用语言URL推断地区准入，排除折扣 |
| Coinbase Advanced | 当前公开帮助页未给出旧0.60%数值上限，完整结构需登录 | 当前数值留未知；不能推断费率变了，也不能继续宣称上限已核验 |
| Kraken Pro | 7月9日新表Tier1现货吃单0.80% | 明确Pro、Tier1，不混用Instant Buy或独立稳定币/外汇费率 |

各行官方依据：[Binance教学文](https://www.binance.com/en/academy/articles/how-to-calculate-transaction-fees-on-binance)、[OKX标准组公告](https://www.okx.com/en-gb/help/advance-notice-spot-and-futures-trading-fee-adjustment)、[OKX欧洲账户差异](https://www.okx.com/en-eu/help/what-are-the-new-trading-fees-for-eea-users)、[KuCoin VIP表](https://www.kucoin.com/support/48142946141635)、[Bybit费率表](https://www.bybit.com/en/help-center/article/Trading-Fee-Structure)、[Bitget基础费](https://www.bitget.com/en-CA/support/articles/12560603820584)、[Coinbase说明](https://help.coinbase.com/en/coinbase/trading-and-funding/advanced-trade/advanced-trade-fees)、[Kraken调整表](https://support.kraken.com/articles/cross-platform-fee-tier-changes)。

不要引导新手为了费率开通衍生品账户。此次地区差异只用于正确界定比较范围，不构成操作建议。

## 3. 新增可运行能力

- `build/ops/source_review.mjs`：验证七条来源记录与旧快照指纹，报告未确认、口径差异、数值变化、未来日期或过期观察。
- `--require-current`：证据条件不满足时退出码2；当前实际结果为拦截，原因是Binance、OKX、Coinbase三项。
- 内容包新增`source-review.json`、`source-review.md`、`readiness.json`、`review_hash`、`promotion_hold`。旧包不能借用新审阅，改稿不能沿用旧指纹。
- 完整性验证和事实审阅分别记录。即使所有来源条件满足，`publication_allowed`仍为false；没有伪造人工批准。
- 中英各3条品牌/教程草稿及英文简介，保存于`ops/automation/campaigns/x-launch-2026-08-31.json`。新活动UTM为`feeeye-launch`，已注册白名单并测试落地页存在、文案长度和发布关闭状态。

以上脚本离线读取本地审阅记录，不是已经上线的全天候网页采集器。没有新增定时任务或社交发布模块。

## 4. 验收

`node build/validate_local.mjs`通过：原交易所/提币报价检查、386张程序化页面生成、隐私事件、来源检查、品牌草稿、旧内容包回归及IndexNow dry run。

新增测试包括：漏行/重复行、伪官方域名、未知费率写入数字、未来日期、超过7天内部复核窗口、快照数值不匹配，以及证据全部通过仍不能自动获准发布。

新带PNG内容包：`ops/automation/generated/2026-08-27-v1-4be861590d1b4586/`。

内容指纹：`4be861590d1b4586cb3fa13a5dbfe4b030b0e77df33954e33a5066c68dd77a5e`。保留历史图，只供审核，`promotion_hold=true`，不是新一期已批准的数值推广素材。

## 5. 下一步

先审定一种账号语言的品牌介绍、总成本方法和安全转账三条草稿。费率对比另按地区/产品/账户条件修订，对未核实平台留未知。待具体稿件与账号获批后，再执行人工发布或原生排程。

原官网与工具当前仍未应用本地修正；此次没有覆写8月27日历史快照，也没有把不完整核验包装为新版全平台报价。远程分支保护、部署回执、效果周报和实际排程仍待后续实施。
