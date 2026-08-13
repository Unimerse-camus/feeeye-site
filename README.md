# Crypto Exchange Affiliate Site — 执行脚手架

> 本目录是《Crypto 返佣执行路线图》的起点实现。当前 **P0–P3 已落地**：数据底座 + 合规模板 + 工具 MVP + 程序化 SEO 引擎（101 个静态页）。
> 商业模式：围绕币圈用户的「费率/提币/某币在哪买/某国可用所」需求做免费工具与数据，用 Exchange Affiliate 变现（先 KuCoin，后多所）。

## ⚠️ 合规前提（务必遵守）
- 仅面向 KuCoin 当前允许的地区；排除 **CN / HK / US / SG** 等 Restricted Locations。
- 不投 KuCoin 相关搜索广告（除非书面授权）、不仿冒官方页、不批量注册。
- 所有 affiliate 链接 `rel="sponsored nofollow"` + 页面披露。
- 费率/可用性数据须真实、标更新时间，上线前逐条核实官方文档。

## 目录结构
```
affiliate-site/
├── data/
│   ├── exchanges.js          # 交易所费率/提币费/网络/能力（P1 真相源）
│   ├── coins.js              # 20 币种子（回退用）
│   ├── coins.json            # 79 币真实快照（CoinGecko 2026-08-08）+ 元数据
│   └── country_availability.js # 国家 × 交易所可用性（合规核心，含受限标记）
├── tools/
│   └── fee-calculator.html   # P2 MVP：手续费 + 提币费对比计算器（含地区过滤 + KuCoin CTA）
├── build/
│   ├── generate.mjs          # P3 程序化 SEO 静态生成器（零依赖，vm 复用 data/*）
│   └── fetch_coins.mjs       # CoinGecko 摄取管线（在可访问 CG 的主机上运行，产出真实覆盖）
├── legal/
│   ├── affiliate-disclosure.md
│   ├── privacy-policy.md
│   └── terms.md              # P0 合规三件套（模板，待填 [brackets]）
├── docs/
│   ├── deploy-guide.md       # 域名注册 + 海外主机部署指南（含分步注册操作）
│   └── tg-bot-spec.md        # P5 英文 TG 行情 Bot 规格（命令/技术栈/CTA/合规）
├── ops/
│   └── referral-tracker.md   # 返佣追踪看板（三库之一，漏斗量化 + 周报模板）
├── dist/                     # 生成产物（101 静态页）：index / where-to-buy / exchanges / compare / [country]/exchanges
└── README.md
```

## 技术栈决策
- **当前（原型/MVP）**：纯前端 vanilla JS + 数据以 `.js` 文件挂到 `window`（避免 file:// 的 fetch/CORS 问题）。**直接双击 `tools/fee-calculator.html` 即可运行**，零构建。
- **P3 程序化 SEO（已落地）**：零依赖 Node 静态生成器 `build/generate.mjs`，通过 vm 复用 `data/exchanges.js` + `data/country_availability.js`，币种优先读 `data/coins.json`（CoinGecko 真实快照）。产出标准静态 HTML 到 `dist/`：
  - `index.html` + 68 个 `/where-to-buy/[coin].html`（含实时价格/市值/排名 + 真实支持所对比 + KuCoin CTA）
  - 7 个 `/exchanges/[slug].html` + 4 个 `/compare/kucoin-vs-[x].html`
  - 21 个 `/[country]/exchanges.html`（**仅非受限地区**，合规友好，受限地区绝不生成页面）
  - 自动拷贝 `tools/` 与 `data/`，站内计算器可用。
  - 输出格式与 Astro 兼容，**规模期再迁 Astro**（无需重写数据层）。
- **数据刷新**：在可访问 `api.coingecko.com` 的主机运行 `node build/fetch_coins.mjs`（默认 Top 250 + 逐币 tickers 真实覆盖；`--no-coverage` 用启发式；`--top N` 控制数量）。本地产物用 `coins.json` 启发式覆盖，页面已标注「indicative — verify」。
- **生成命令**：`node build/generate.mjs`（在 `affiliate-site/` 目录下运行）。

## 执行状态（对照路线图）
| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 合规 | 起草三件套模板 ✅ / 地区白名单 ✅ | 部分完成 |
| P0 合规 | **用户确认 HODL100 是普通 Referral 还是正式 Affiliate、真实费率/二级条款** | ✅ 已确认正式 Affiliate |
| P0 合规 | 注册品牌域名 + 海外主机 | ✅ **feeeye.com 已注册**（Porkbun，2026-08-11）；Cloudflare NS 已切、Pages 已部署、自定义域名绑定中 |
| P1 数据 | exchanges / coins / country 三张表 + 校验 ✅ | 完成 |
| P2 工具 | 手续费 + 提币费计算器 ✅（含地区过滤、CTA、披露） | 完成 |
| P3 SEO | 程序化生成器 + 118 币 where-to-buy（已滤稳定币/RWA 基金）+ 21 国家页 + 真实价格 + CoinGecko 摄取管线（含 A1 币种过滤） ✅ | 完成 |
| P4 GEO | 原创 benchmark 报告 | 未开始 |
| P5 内容 | YouTube / X / Newsletter 分发 | 未开始 |
| P5 运营 | 返佣追踪看板 ✅ + 英文 TG Bot 规格 ✅ + 落地执行手册 ✅（融合外部手册方法论，合规化） | 完成 |
| P6 二级 | 招 KOL/群主/工具开发者 | 未开始 |
| P7 放大 | 多所 affiliate + A/B | 未开始 |
| 工具库 | 工具矩阵规划 ✅（`docs/tools-roadmap.md`：T1 全成本 → T2 智能对比 → T3 清算 → T4 Gas [MVP] → T5 跨平台盈亏 → T6 DCA [扩展] → T7 P2P → T8 代币安全 [地区化]；融合 2026-08-13 工具调研 PRD 8 工具 + 痛点硬数据 + 地区差异化 + 返佣嵌入原则）+ 竞品调研 ✅（`docs/tools-competitor-research.md`） | 规划完成，待落地 |
| 多所返佣 | 主流 10 所返佣政策对比 ✅（`docs/exchange-affiliate-comparison.md`，用户明天逐所申请；MEXC 70%/Bitget 40%/Bybit 30% 起优先） | 待用户申请 |

## 下一步（按优先级）
1. **多所返佣申请**（用户）：按 `docs/exchange-affiliate-comparison.md` 第二梯队顺序：MEXC → Bitget → Bybit → Gate → OKX；Binance/Kraken/Coinbase 暂搁置。回填结果到 `ops/referral-tracker.md`，启动站点多所 CTA 切换。
2. **MVP 工具库（Week 1-2）**：按 `docs/tools-roadmap.md` 第一阶段顺序——**T1 全成本计算器**（含入金/价差/滑点/提现，竞品无）→ **T2 智能交易所对比**（10 维度+地区合规过滤）→ **T3 合约清算**（多所公式+资金费率预警）→ **T4 Gas 智能追踪**（"该不该操作"建议+跨链提醒）。每个 en+zh 双语 + CTA + 地区过滤。
3. **数据维护**：周日提醒**手动核对** 7 所官方费率页（每周 30 分钟，不是自动的）。
4. **页面优化**：首页工具矩阵卡片分组、币页相关工具区、移动端体验。
5. **数据**：A2 扩币 150→500+；持续观察 GSC 收录。
6. P4：写第一份原创 benchmark 报告做 GEO 弹药。
7. 上线前请目标司法辖区合规顾问复核 Terms / 地区限制。

## 本地预览
- 浏览器打开 `dist/index.html`（先看整站）。或 `tools/fee-calculator.html`（计算器）。
- 切换计算器国家为 US / CN / HK / SG 可验证 CTA 正确隐藏；切到 DE / BR / JP 等可见 KuCoin 注册入口。
- 直接打开 `dist/where-to-buy/pepe.html`、`dist/de/exchanges.html` 看程序化页与合规国家页。
