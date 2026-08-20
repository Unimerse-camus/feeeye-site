# 交易所对比数据审计（2026-08-20）

## 本轮范围

- 7 家交易所基础费率与比较字段的结构完整性。
- 21 组两两对比是否至少存在一个共同 USDT 提币网络。
- 提币费用与 `supported_networks` 的内部一致性。
- 费率更新时间、来源链接、双语字段和入金费率区间。

运行方式：

```bash
node build/audit_exchange_data.mjs
```

## 自动审计结果

- 交易所：7
- 两两组合：21
- 阻断错误：0
- 初始警告：2

### 已修复：KuCoin Plasma

数据中已有 USDT Plasma 提币费，但 `supported_networks` 未包含 Plasma。KuCoin 官方公告确认平台已支持通过 Plasma 网络提取 USDT，因此已补齐支持网络字段。

官方依据：https://www.kucoin.com/announcement/tr-limited-time-offer-0-fee-for-usdt-withdrawals-on-plasma-network

公告中的零费率是 2025 年限时活动，不能用于当前费率；当前页面仍保留现有快照费率并要求交易前核对实时提币页。

### 保留警告：Coinbase Polygon

Coinbase 数据将 Polygon 记录为支持网络，但当前没有可靠的 Coinbase Exchange 官方固定 USDT Polygon 提币费，因此没有补造费用。

Coinbase 的 USDT 资产页面列出了 Polygon 合约地址，但这不足以证明特定地区的 Coinbase Exchange 当前开放该网络提现，也不能证明具体费用：

https://www.coinbase.com/price/tether

处理原则：继续把 Polygon 记为能力信息；由于费用未知，它不会进入共同网络费用胜负计算。

### 已修复：Bitget KYC

旧数据写成“1 万美元以下免 KYC”。Bitget 官方帮助中心说明，自 2024 年 1 月 1 日起，充值和交易等核心服务要求完成身份验证；未完成一级认证的用户自 2024 年 7 月 20 日起也无法提现。因此已改为“核心服务强制 KYC”。

官方依据：https://www.bitget.com/support/articles/12560603808893

### 已修复：OKX 香港牌照

旧数据把“中国香港 SFC”列为现有牌照。OKX 官方公告显示，OKX HK 已撤回 VASP 牌照申请，并于 2024 年 5 月 31 日停止向香港居民提供中心化虚拟资产交易服务。因此已移除“香港 SFC 牌照”，改为明确标记申请已撤回。

官方依据：https://www.okx.com/en-gb/help/withdrawal-of-okx-hks-vasp-license-application

### 已修复：Coinbase USDT 处理费

Coinbase 官方费用披露说明，所有 USDT 提现额外收取转账金额 0.01% 的处理费，上限 20 USDT，此外还会产生动态网络费。两两对比页现以“提取 1,000 USDT”为统一示例，将 0.01% 处理费计入 Coinbase 结果，并继续把网络费标为快照。

官方依据：https://help.coinbase.com/en/coinbase/trading-and-funding/pricing-and-fees/fees

## 数据风险分级与刷新建议

| 数据 | 风险 | 建议频率 | 页面处理 |
|---|---:|---:|---|
| USDT 各网络提币费 | 很高 | 每日或自动获取 | 标记快照日期；动态费用不作长期承诺 |
| 法币入金通道与费用 | 很高 | 每周、按地区 | 只展示参考区间，不宣布总成本赢家 |
| 现货/合约基础档费率 | 中 | 每周 | 显示普通用户基础档及金额示例 |
| KYC、地区限制、牌照 | 很高 | 每月并监听公告 | 页面要求先核对地区；不提供全球统一结论 |
| 储备率与资产证明 | 高 | 每月 | 标明披露口径与时间，不等同安全保证 |
| 币种数、交易量、信任分 | 高 | 每日/每周 | 使用同一数据源和快照时间 |
| 历史安全事件 | 低 | 事件发生时 | 展示事件与后续处理，不压缩成单一安全分 |

## 后续核验顺序

1. 先复核页面会直接产生胜负的字段：现货费率、共同网络提币费。
2. 再复核会决定用户能否使用的字段：地区、KYC、法币通道。
3. 最后复核展示性字段：币种数、交易量、储备披露与产品能力。
4. 无法获得官方、同口径数据时显示“未知/以实时页面为准”，不使用第三方估算替代确定结论。
