# Telegram Market Bot 规格（英文版）

> P5 内容分发钩子。Telegram 是海外 crypto 用户主阵地，一个有用的行情 Bot 能持续带自然流量回流网站，并在回复底部自然嵌入 KuCoin affiliate CTA。
> 配套：《Crypto 返佣落地执行手册》第六节工具矩阵。

---

## 一、定位

**不是**「返佣推广 Bot」——是「免费的加密货币行情/预警小工具」。用户因工具价值而来，affiliate 是后端变现层（和网站同一个模型）。

命名建议：`CryptoPulse Bot` / `CoinSnap Bot` / `MarketPing Bot`（避开 kucoin/referral/bonus 等词）。

---

## 二、命令清单（英文）

| 命令 | 功能 | 数据源 |
|------|------|--------|
| `/price [SYMBOL]` | 实时价格 + 24h 涨跌 | CoinGecko / CCXT |
| `/alert [SYMBOL] [PRICE]` | 价格到点推送预警 | Bot 后台轮询 |
| `/gas` | 当前 ETH Gas（fast/standard/slow） | 公共 Gas API |
| `/fear` | Fear & Greed 指数 | alternative.me API |
| `/top` | 24h 涨幅前 5 | CoinGecko |
| `/help` | 命令列表 + 站点链接 + 频道链接 | — |

**示例回复**（每条回复底部固定 footer，见第三节）：

```
BTC/USDT  $64,974  ▲ 2.3% (24h)
Vol 28.1B  MC 1.28T

📊 Live on KuCoin
──────────────────────
📊 Data: CoinGecko + CCXT
🔗 More free tools → exchangecompare.io
📱 Research channel → @YourChannel
```

---

## 三、CTA 嵌入（合规化，吸收手册「每回复底部带链接」原则）

**Footer 三件套**（每条回复底部）：
1. `🔗 More free tools → [站点]` — 回流网站（主目标）
2. `📱 Research channel → @Channel` — 沉淀到 TG 频道
3. 数据来源标注 — 建立可信度

**Affiliate CTA 嵌入原则**（和网站一致）：
- 不在每条回复都塞 affiliate 链接（避免 spam 感）。
- 仅在**价格回复里自然带**「📊 Live on KuCoin → [affiliate link]」一行（因为用户查价格 = 有交易意图，最贴转化）。
- `/alert`、`/gas`、`/fear`、`/top` 回复**不带** affiliate，只带站点回流。
- Affiliate 链接 = 站点的 redirect 中转（如 `exchangecompare.io/go/kucoin`），后端 302 到 KuCoin affiliate URL，统一加 `rel="sponsored nofollow"`（站点侧）。

---

## 四、技术栈

| 组件 | 选型 | 说明 |
|------|------|------|
| 运行时 | Python 3.11+ | 你阿里云已有 Python 环境 |
| Bot 框架 | `python-telegram-bot` v21+ | 主流、文档全 |
| 行情数据 | `ccxt` 库 + CoinGecko API | CCXT 统一多所接口；CoinGecko 兜底 |
| Gas | `web3` 或公共 API | gasprice.io / etherscan |
| Fear&Greed | alternative.me API | 免费 |
| 存储 | SQLite | alert 订阅持久化（轻量） |
| 部署 | 你的海外 VPS / Cloudflare Worker | **不能放阿里云大陆节点**（合规 + 访问性） |

> ⚠️ Bot 部署位置和网站托管同理：海外，与策略服务器分开。Bot 只是「数据摄取 + 回复」，不涉及公开 web 内容托管，但仍属面向境外 crypto 用户的运营，放海外更稳妥。

---

## 五、合规约束

- Bot 语言：英文。
- `/start` 欢迎语声明：本工具不面向 Restricted Locations（CN/HK/US/SG）用户；不构成投资建议。
- 不承诺收益、不喊单、不推荐具体买卖方向——只给客观数据。
- 不主动群发营销消息（除用户订阅的 `/alert` 预警）。
- 数据真实，标注来源与更新时间。
- Affiliate 披露：`/help` 里声明「部分链接为 affiliate link，你可能为我们带来佣金，但不影响你的费率」。

---

## 六、开发计划（P5 阶段）

| 周 | 任务 | 工时 |
|----|------|------|
| W1 | MVP：`/price` + `/help` + footer | 2 天 |
| W2 | `/alert`（SQLite 持久化 + 轮询） | 2 天 |
| W3 | `/gas` + `/fear` + `/top` | 1 天 |
| W4 | affiliate CTA 中转页 + 频道沉淀 + 上线 | 1 天 |

**MVP 验收**：用户 `/price btc` 返回正确价格 + footer 回流站点 + affiliate 行仅在价格命令出现。

---

## 七、与主站飞轮的衔接

```
TG Bot 回复底部 → 站点工具（fee calculator / where-to-buy）
                → 用户在站点产生 affiliate 转化
                → 返佣追踪库记录（channel=tg-bot）
                → 频道沉淀用户 → 每周数据报告推送 → 回流站点
```

Bot 是飞轮「内容分发」齿轮的一个入口，和 X/YouTube/Reddit 同级，但粘性更高（工具型，用户会反复用）。

---

## 八、后续可选增强

- `/compare [coin]` — 调站点 where-to-buy 数据，直接在 TG 返回支持所对比（强转化）。
- `/fee [amount] [exchange]` — 调站点费率计算器逻辑。
- 订阅日报：每日 09:00 UTC 推送市场早报到频道。
- 多所价格对比：`/price btc` 返回 KuCoin/Binance/Bybit 三所价差（套利用户爱用）。
