# 交易所对比页：新用户诉求研究（2026-08-19）

## 研究目的

为 FeeEye 交易所两两对比页确定信息优先级。重点不是收集“哪家最好”的推荐，而是识别新用户在选择、首次买入和首次提币时反复出现的问题。

## 证据范围与限制

- 学术研究：2 项直接相关用户研究（395 名投资者及潜在投资者；15 名中国交易所用户）和 1 项交易所选择评价研究。
- 用户讨论：Reddit 的 CryptoHelp、CryptoCurrency、BitcoinBeginners 等公开讨论，关注用户原始问题及回复中反复出现的主题。
- 视频：公开的 Binance/OKX 对比与新手全流程视频，使用标题、章节和公开互动量判断内容需求。
- 中文网页与搜索结果只作为主题补充。大量内容带返佣链接、缺少样本说明，因此不作为独立结论依据。
- 这是定性证据汇总，不是 FeeEye 自有用户调研，也不能推导精确的需求占比。论坛可能存在推广账号，视频选题也会受 SEO 和返佣激励影响。

## 可用于页面决策的发现

| 新用户诉求 | 证据摘要 | 页面决策 |
|---|---|---|
| 可信、安全，避免诈骗 | 395 人研究把欺诈风险、知识不足和难以识别可信信息列为常见障碍；交易所评价研究中安全感知权重最高（0.2287），其次是声誉（0.1797） | 首屏先提示地区/KYC 与可信度核验；展示牌照、储备披露、重大事件，不用单一“安全分”代替事实 |
| 简单完成第一次小额买入 | 论坛新手反复描述功能过多、界面复杂，只想用 50–100 美元先学习 | 首屏用普通用户、固定金额示例；maker/taker 术语附普通话解释；高级功能后置 |
| 看懂真实总成本 | 用户讨论同时提到交易费、价差、入金费和固定提币费；只看标称费率会低估成本 | 将“交易手续费”明确限定为基础档示例；入金费与价差不能核实时不宣布总成本赢家 |
| 提币网络选择与防错 | 提币讨论反复出现选错链焦虑、固定费用对小额转账影响、先小额测试、地址与接收网络必须一致 | 只比较双方共同支持的网络；逐网络展示费用；加入网络一致和小额测试提醒 |
| 所在地区能否使用、KYC 是否可完成 | 新手选所讨论常把地区、KYC、法币通道和客服与费用一起询问 | 不给全球统一推荐；把“先核对地区与身份验证”放在结论之前 |
| 合约不是首要新手任务 | 新手原话多为买少量 BTC/ETH、学习钱包与转账，并明确表示不需要高级交易 | 合约、杠杆、期权、API、机器人放入折叠的进阶区，并显示高风险提示 |

## 关键来源

1. Hadan et al., *Comprehending the Crypto-Curious*：调查投资者及有兴趣但缺乏经验的潜在投资者（n=395）。https://uwspace.uwaterloo.ca/items/49452a36-424c-4758-9f99-932eba2454ac
2. Zhou & Shen, *Toward Understanding the Use of Centralized Exchanges for Decentralized Cryptocurrency*：访谈 15 名中国交易所用户。https://arxiv.org/abs/2204.08664
3. Financial Innovation, *A fuzzy BWM and MARCOS integrated framework for evaluating cryptocurrency exchanges*：安全感知、声誉和佣金率是前三项决策因素。https://link.springer.com/article/10.1186/s40854-023-00543-w
4. Reddit / CryptoHelp, “What crypto exchange would you actually recommend to a beginner?”：小额买入、界面复杂、费用和高级功能压力。https://www.reddit.com/r/CryptoHelp/comments/1sl1p1m/what_crypto_exchange_would_you_actually_recommend/
5. Reddit / CryptoCurrency, “What advice do you have for beginners trying to withdraw their crypto from exchanges?”：网络选择、固定提币费、地址核对与小额测试。https://www.reddit.com/r/CryptoCurrency/comments/z618x1/what_advice_do_you_have_for_beginners_trying_to/
6. Reddit / BitcoinBeginners, “What crypto exchange are you actually using in the US right now?”：地区、KYC、费用、客服和自托管的权衡。https://www.reddit.com/r/BitcoinBeginners/comments/1stcze3/what_crypto_exchange_are_you_actually_using_in/
7. YouTube, MoneyZG, “Binance vs OKX: Best Crypto Exchange?”：公开章节覆盖交易费、入金、提币、交易工具；19,551 次观看（检索时快照）。https://www.youtube.com/watch?v=jhMSu_qhfQk
8. YouTube 中文新手全流程视频：注册、KYC、法币买入、现货与链上充提币构成连续任务。https://www.youtube.com/watch?v=kr7rBJnqKhk

## 重构原则

1. “确定性结果”只用于口径明确且可计算的数据。
2. 不完整的数据明确标注缺口；不把基础交易费包装成总成本。
3. 先解决可用性、可信度、买入与提币，再展示交易能力。
4. 每个胜负结论必须同时显示金额、费率、假设和快照日期。
5. 页面上线后用真实点击与 5–8 名新手任务测试继续验证，本研究只作为第一版依据。
