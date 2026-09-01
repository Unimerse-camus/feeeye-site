# Crypto工具运营与分发渠道调研

日期：2026-09-01。目的：修正FeeEye把X当成默认主渠道的偏差。结论基于公开网页、平台自述和第三方估算；没有读取竞品内部分析后台，因此“存在渠道”与“该渠道贡献最多用户”严格分开。

## 结论

Crypto工具没有单一通用主平台。成熟工具通常同时经营四种分发机制：

1. 搜索、直接访问和可复用工具页负责长期获客；
2. X、YouTube和Telegram承接行业注意力；
3. Reddit、CMC Community、Discord等承接问题、信任和支持；
4. GitHub、公开查询、嵌入组件和用户生成内容形成产品内分发。

FeeEye面向新手费用与安全问题，更接近“搜索型工具 + 教育内容”，而不是交易终端或实时喊单频道。建议主顺序为：搜索/网站 → YouTube → X与问题社区 → GitHub/Product Hunt；Telegram、Discord和Newsletter延后。

## 公开证据

- CoinGecko在2026年更新的文章披露了一项2,558人调查（问卷实际采集于2024-06-25至07-08）：主要停留平台为X 41.7%、Telegram 21.5%、YouTube 20.8%；主要信息来源为X 34.4%、YouTube 23.4%、Telegram 16.0%，Reddit仅3.3%。这是Crypto注意力分布，不是工具网站的流量归因，且样本较旧，只能作为方向证据。https://www.coingecko.com/research/publications/crypto-community-media-usage
- 一份韩国散户调查显示明显的地区差异：社交信息渠道中YouTube 35.64%、Telegram 24.22%、Twitter 18.38%；价格和图表工具使用中CoinMarketCap 20.58%、TradingView 13.78%、CoinGecko 6.36%。不能把全球样本直接套到单一区域。https://research.despread.io/content/files/2025/03/2024-South-Korean-Crypto-Retail-Investor-Trends-Report.pdf
- CoinGecko官方同时维护网站、X、Telegram、Reddit、Discord和YouTube，说明成熟工具采用组合渠道，而非只依赖X。https://support.coingecko.com/hc/en-us/articles/4539244206105-What-are-the-Official-Channels-for-CoinGecko
- CoinMarketCap自述覆盖网站、移动应用、Newsletter和社交渠道；其Academy持续生产教育、词典、研究和API内容，并通过日更Newsletter与YouTube复用。https://coinmarketcap.com/about/ https://coinmarketcap.com/academy https://coinmarketcap.com/newsletter/
- Dune将Discord用于实时社区支持、Telegram用于更新、YouTube用于教程、GitHub用于开发者协作；同时允许查询、图表和Dashboard通过链接、社交网络和iframe嵌入传播。https://docs.dune.com/resources/support/overview https://docs.dune.com/web-app/share
- DeFiLlama通过开源adapter和项目方PR形成数据供给与分发闭环。其adapter仓库公开显示大量fork和持续PR，但这种开发者渠道更适合方法透明与项目集成，不是FeeEye新手获客的第一入口。https://github.com/DefiLlama/DefiLlama-Adapters
- Product Hunt可提供一次性发布曝光，但Dune和CoinStats页面所示更像产品发布与评价资产，不足以证明持续获客能力。https://www.producthunt.com/products/dune-analytics/awards https://www.producthunt.com/products/coin-stats

## FeeEye首个28天免费渠道组合

| 渠道 | 时间占比 | 28天候选动作 | 角色 |
|---|---:|---:|---|
| 搜索/网站 | 40% | 4次原创页或实质更新 | 问题意图获客 |
| YouTube | 20% | 4条3–6分钟录屏教程 | 演示与信任 |
| X | 15% | 8条低频原创帖 | 扩散与快速反馈 |
| Reddit/问题社区 | 20% | 8个基于真实问题的人工回答 | 问题验证与信任 |
| GitHub/Product Hunt | 5% | 1次方法公开或产品发布 | 技术信任与一次性发现 |

这些比例是预注册实验分配，不是已证明的最佳组合。每条内容记录有效访问和人工小时；只有单条达到30个有效访问、且同渠道至少两个可比较内容时才进入效率排序。缺失不记为0，不因早期单条爆发自动放大。

首轮可归因社区链接只使用已注册的`reddit / community` UTM。CMC Community可以先做不带FeeEye链接的人工问答探索；若后续要作为独立可归因渠道，必须先新增自己的UTM注册项和测试，不能把CMC访问伪装成Reddit。

## 延后渠道

Telegram、Discord和Newsletter不是被否定，而是延后到出现重复需求之后：28天内至少记录10个真实重复问题、运营者能承诺每周2小时审核/管理，并再次明确批准。Newsletter还要先完成隐私审查，避免尚无稳定需求时收集邮箱。

## 对自动化工作流的影响

- X计划器保留，但降为多渠道组合中的一个模块。
- 下一模块应生成YouTube脚本/分镜和社区回答审阅包，不自动上传或回帖。
- 搜索任务继续走PR、生产版本验证和变化URL通知。
- GitHub只公开方法、数据口径和可复核材料；Product Hunt仅做一次性发布，不当成周更渠道。
- 所有外部发布继续需要人工批准；不建设自动点赞、自动回复、批量私信或网页发布机器人。
