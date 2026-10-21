# Crypto 内容语言市场调研(FeeEye 多语言扩展评估)

日期:2026-10-21。目的:回答"除中英文外,crypto 领域哪些语言值得 FeeEye 进入",为 en/zh 对照实验之后的语言扩展决策提供依据。结论性质:公开数据 + FeeEye 自有可用性数据的组合评估;不构成流量或收入预测。

## 一、证据:加密采纳与交易所流量的语言分布

采纳指数与持有率(2026):

- Chainalysis 2026 全球采纳指数:**巴西第 1**(加密经济体 $2525 亿,所有类别全球前四),美国第 2,新加坡/加拿大/乌克兰前列;上一轮(2025)印度第 1,巴基斯坦、越南、巴西随后。https://www.chainalysis.com/blog/2026-global-crypto-adoption-index
- TRM Labs 2026 Q1 指数覆盖 200+ 司法辖区,资金流美国第 1、俄罗斯第 2(约 $480 亿);采纳重心持续向非英语的全球南方移动。https://www.trmlabs.com/resources/blog/q1-2026-global-crypto-adoption-index
- 加密持有率(占互联网用户):UAE 约 30%、土耳其约 25%、越南约 22%,居全球前列。https://investingintheweb.com/crypto/crypto-ownership-by-country

交易所流量按国家(Similarweb/Semrush,2026-09):

- Binance 流量来源前列:美国约 4.5%、**印度约 4.0%、巴西约 2.6%、土耳其约 2.5%**,韩国、俄罗斯、阿根廷、越南、印尼亦居前列。https://www.semrush.com/website/binance.com/overview / https://www.similarweb.com/website/binance.com
- OKX 约 2290 万月访问(全球 #880),KuCoin 约 1610 万(#1152)。https://www.similarweb.com/website/okx.com / https://www.similarweb.com/website/kucoin.com

本地化行业观察:采纳增长最快的市场(印度、巴基斯坦、尼日利亚、拉美、土耳其)正是英语内容覆盖不足的市场,本地化是采纳的前置条件之一。https://montero-ls.com/en/localization-a-must-for-crypto-adoption/

## 二、FeeEye 视角过滤:可用性 ≠ 普及度

自有数据(`data/country_availability.js`,25 国)是硬过滤:**DE/FR/IT/ES/PL 的 KuCoin 可用性为 false(欧盟 onboarding 暂停)——欧洲大陆语言无转化路径**;BR/TR/VN/MX/ID/PH/KR/JP/NG 等为 true。结合既有渠道调研(`docs/crypto-tools-channel-research-2026-09-01.md`:韩国散户重度使用本土平台 CMC/Upbit 生态)与工具路线图地区表(`docs/tools-roadmap.md`:拉美稳定币入金、土耳其抗通胀),排序如下:

### 第一梯队

| 语言 | 理由 | 站内联动 |
|---|---|---|
| **巴西葡语** | 2026 采纳第 1;KuCoin 可用;PT 语费率工具竞争近乎空白;拉美"稳定币入金成本"痛点与 T1 全成本计算器直接对口 | `/br/exchanges.html` 国家页已在 |
| **西班牙语** | 受众最大(整个西语拉美);墨西哥等核心市场 KuCoin 可用;费率工具西语 SEO 竞争低 | `/mx/exchanges.html` 已在(注意:西班牙本国 KuCoin 不可用,内容定位面向拉美而非西班牙) |
| **土耳其语** | 持有率全球前三,通胀驱动的"成本意识"与品牌主张"看清费用"天然契合;roadmap 原有土耳其 DCA 规划 | `/tr/exchanges.html` 已在 |

### 第二梯队(可做非优先)

越南语、印尼语:采纳高、路径通,但单用户返佣价值偏低,内容运营成本与其他语言相同。

### 不建议

- **俄语**:用户供给大但监管灰色、品牌与支付风险;站内国家数据本就未覆盖俄罗斯。
- **韩语/日语**:交易量大但被本土交易所(Upbit/bitFlyer)封闭生态占据;数据标记可用,实际 KYC 与使用习惯壁垒高。
- **德/法/意/波兰语**:KuCoin 欧盟 onboarding 暂停,无转化路径;等政策变化再评估。
- **印地语**:印度用户以英文搜索为主(`docs/tools-roadmap.md` 地区表),英文内容 + `/in/exchanges.html` 已覆盖。
- **阿拉伯语**:UAE 持有率全球第一但金融场景以英语为主;北非市场可作远期观察项。

## 三、与进行中实验的衔接

en/zh 对照实验(cost-en vs cost-zh,2026-10-21 同日发布)的方法论可整体复用于语言扩展:同一内容、不同语言、生命周期检查点(24h/7d/28d)对比曝光/链接点击/落地访问。复盘机器(周报生命周期区 + 下周提案)语言无关,新增语言内容自动纳入。

建议顺序:

1. 2026-11 上旬:en/zh 对照 7d/28d 数据齐 → 定主账号语言;
2. 主语言定后**只加一个语言**做增量验证,首选巴西葡语(采纳第一 + 竞争最小 + BR 国家页联动),次选西语;
3. 最小成本起步:T1 全成本计算器 + 2-3 篇核心教程(转账安全/真实总成本)的 PT 版,4 周 GSC/X 数据观察后再决定是否扩展;
4. 每新增一种语言都走同一套门禁:真实数据、双语(多语)一致性校验、地区合规过滤(受限地区 CTA 隐藏逻辑需同步扩展到新语言页)。

## 四、局限

- Similarweb/Semrush 国别明细部分在付费墙后,俄/韩/日的交易所流量为方向性证据;
- 采纳指数衡量链上活动,不等于联盟返佣转化率;语言选择还需用 FeeEye 自有漏斗验证;
- 对照实验单对样本,结论方向性而非统计显著(与渠道政策的样本门槛纪律一致);
- KuCoin 地区政策会变,扩展前需重新核对官方 Restricted Locations 与欧盟 onboarding 状态。
