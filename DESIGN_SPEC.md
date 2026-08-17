# FeeEye 站点设计规范 · 建设经验沉淀（阶段性成果）

> 更新：2026-08-17。新增工具 / 页面 / 内容时**先读本文件**，直接套用，不要再犯基础规范错误。

---

## 一、视觉与主题

| 项 | 规范 |
|---|---|
| 主题 | 浅色（light） |
| 品牌色 | 蓝 `#2563eb` → 青 `#0ea5a4`（logo 渐变） |
| 涨跌色（中国习惯） | 涨=红 `#dc2626`，跌=绿 `#16a34a` |
| CSS 变量 | `--brand` `--ink` `--sub` `--line` `--card` `--ok` `--warn` `--bad` `--down` |
| 字号 | 正文 14px；h1 25px；备注/页脚 12px |

- 货币默认符号：`¥`（金融场景）；本站在工具里用 `USDT` 计价，直接写 `USDT`。

---
7. **顶部 nav 间距**：`gap: 20px`（工具/交易所/对比/学习 4 项紧凑排列），过宽会显得空散、不专业。
8. **图标复用**：导航下拉（如未来增加）的图标必须**复用首页工具卡片的 `ICON` 字典**（`ICON.receipt/trend/scale/shield/wallet`），不另设计新图标，保持全站视觉一致。

---

## 二、表格规范

1. 全站 `table` 的 `th,td` 统一 `text-align:center`（居中）。
2. **交易所序列前三位固定**：Binance → OKX → KuCoin，其余按 `EXCHANGES` 声明顺序（bybit/bitget/kraken/coinbase）。
   - 生成页用 `PRIORITY = ['binance','okx','kucoin']` + `slugs = [...PRIORITY.filter(包含), ...其余]`。
   - 工具页把 `Object.keys(window.EXCHANGES).forEach(...)` 替换为：
     `["binance","okx","kucoin"].concat(Object.keys(window.EXCHANGES).filter(s => !["binance","okx","kucoin"].includes(s))).forEach(...)`。
3. 首列（交易所名/维度名）`position:sticky; left:0` 固定。

---

## 三、备注（内容性提示）规范

1. 所有「内容性备注」（数据快照、合规提示、术语解释等）**统一用 `.note` class**：
   ```css
   .note{font-size:12px;color:var(--sub);padding:0;text-align:left;line-height:1.6}
   ```
   生成页 `.note` 上间距 `18px`；工具页（exchange-comparator）`.note` 上间距 `12px`。
2. **不做估算值**——P2P/C2C 溢价、价差等属正常市场行为，**不作为判断交易所优劣的标准**，不展示估算溢价。
3. 间距：表格与下方备注 `4px`；两段 `.note` 之间 `12px`。

---

## 四、页底（footer）规范 —— 全站统一三行

```
[免责行] 仅供教育参考，不构成投资建议。请以各交易所官方页面核实所有数据。数据快照 {日期}
[邮箱行] 如有任何功能需求和建议，或网页有错误需要修正，请联系 feeeyeofficial@gmail.com
[导航行] 首页 · 关于我们 · 隐私政策 · 使用条款
```

- 导航行「首页」放**第一位**；**首页页底跳过「首页」链接**（`noHomeFoot: true`）。
- 生成页由 `page()` 的 foot 渲染；工具页在 `<div class="foot">` 里写同样的三行。

---

## 五、数据规范

1. **唯一真相源**：`data/exchanges.js`（7 所费率/提币费/网络/能力）、`data/coins.json`、`data/country_availability.js`。
2. 数据必须真实、标注更新时间；**不做估算值**。
3. **快照日期有两条链路，都必须自动刷新**：
   - `coins.json` 的 `generated_at` → 生成页 `discHtml` 的 `{SNAPSHOT}`（COIN_SNAPSHOT 读取）。
   - `exchanges.js` 的 `last_updated` → 工具页 `window.EXCHANGES[].last_updated` 读取。
   - 两者都由 CI 每日 `fetch_exchange_meta.mjs` 更新（`last_updated` 已加入自动更新为当天）。
4. 提币费**只有 USDT 维度**（`supported_networks` / `usdt_withdrawal` 都是 USDT 维度）；**币种级提币费数据缺失**，交易所 API 对 GitHub 美国 runner / Cloudflare 有地区限制拉不到，已放弃。展示提币数据必须标注「USDT」。

---

## 六、双语规范

- 中英双语；中文路径前缀 `/zh/`。
- 生成页 I18N 集中在 `generate.mjs` 的 `I18N` 对象（`en` / `zh` 两个对象，字段一一对应）。
- 工具页手工 HTML 分两个文件：`xxx.html`（en）+ `xxx.zh.html`（zh），内容分别写死。

---

## 七、技术栈与目录

- **vanilla JS + 数据挂 `window`**（零构建，直接打开 HTML 可用）。
- 生成器 `build/generate.mjs`：读 `data/*` → 生成 `dist/*` 静态页，并拷贝 `tools/*.html` + `data/` 进 `dist/`。
- `tools/*.html` 是**手工页**（不经过 generate 模板），改工具页直接改 `tools/*.html`，再跑一次 generate 拷贝进 dist。
- 部署：Cloudflare Pages 连 Git 自动部署（`git push main` 即触发，约 1-2 分钟）。

---

## 八、CI 规范

- 文件 `.github/workflows/refresh-coins.yml`。
- 触发：`push`（忽略 `data/**` `dist/**` 避免循环）+ 每日 cron（UTC 16:00 = 北京 0 点）+ `workflow_dispatch`。
- 步骤：`fetch_coins`（CoinGecko Pro，`--top 150` + trending + hotlist）→ `fetch_exchange_meta`（coins/volume/trust + last_updated）。
- CoinGecko 付费 Pro key：`pro-api.coingecko.com` + 头 `x-cg-pro-api-key`（免费 Demo 是 `api.coingecko.com` + `x-cg-demo-api-key`）。
- 本机 `git` 已配 SSH（账号 `Unimerse-camus`），AI 直接 add/commit/push，不用每次问。

---

## 九、合规红线（最高优先级）

1. affiliate 链接一律 `rel="sponsored nofollow"` + 页面披露。
2. 排除 CN / HK / US / SG 等 Restricted Locations。
3. 不投交易所搜索广告（除非书面授权）、不仿冒官方、不批量注册。
4. 数据须真实、标更新时间。

---

## 十、易错点（经验教训，务必避免）

1. **改完深度检查**：改完 bug 立即通读改动函数，检查边界 / 数据兼容 / 双扣漏扣 / 新老数据并存。
2. **字段语义要清晰**：`supported_networks` 实际是「USDT 支持的链」，不是「交易所所有币网络」，展示必须标注维度。
3. **出金 ≠ 提币**：出金 = 提现成法币；提币 = 提到别的钱包/平台。别混淆。
4. **Cloudflare 缓存**：HTML `max-age=0` 但浏览器可能缓存旧版，改动后需 `Cmd+Shift+R` 硬刷新验证；线上验证用 `curl -L`（注意裸域 308 跳 www）。
5. **交易所 API 地区限制**：GitHub 免费 runner 在美国，Binance 返回 451、OKX 401、Bybit 403、KuCoin 空——**从美国数据中心 IP 拉不到这些所的币种级数据**，只有 Bitget 开放。不要指望在 CI 里拉这些所。
6. **本机沙箱访问不了交易所 API**（HTTP 000），需 CI（GitHub 海外 runner）跑；本机 `git push` 触发 CI。
7. **empty commit 不触发 CI**，需要真实文件改动才触发 workflow。

---

## 附：新增工具/页面的标准 checklist

- [ ] 表格 `th,td` 居中；交易所前三位 Binance/OKX/KuCoin
- [ ] 备注用 `.note`（12px 灰字 left line-height:1.6）；表格后间距 4px，备注间 12px
- [ ] 页底三行（免责 / 邮箱 / 首页·关于·隐私·条款，首页放第一位）
- [ ] 中英双语（工具页分 .html / .zh.html）
- [ ] 数据来自 data/*，真实 + 标更新时间；不做估算值
- [ ] affiliate 链接 rel="sponsored nofollow" + 披露
- [ ] 涨红跌绿；品牌蓝 #2563eb
- [ ] 改完 `node build/generate.mjs` 重新生成 + git commit/push
