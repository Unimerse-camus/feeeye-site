# 部署指南：品牌域名 + 海外主机

> 配套《Crypto 返佣执行路线图》P0 上线前置项。本指南只覆盖「域名注册」与「海外静态托管」两项，
> 不涉及 KuCoin 费率数据替换、CoinGecko 抓取等已在前序文档说明的内容。
>
> ⚠️ 合规前提（贯穿全文）：站点必须英文、仅面向 KuCoin 当前允许地区、排除 CN/HK/US/SG 等
> Restricted Locations；不投 KuCoin 搜索广告、不仿冒官方页、不批量注册。上线前请目标辖区合规顾问复核。

---

## 一、域名

### 1. 命名铁律（先排雷，违反任一条都可能是致命伤）

| 禁用类型 | 示例 | 原因 |
|---------|------|------|
| 交易所商标词 | `kucoin` `binance` `bybit` `okx` `coinbase` `crypto.com` | 商标侵权 + 仿冒官方嫌疑（KuCoin 条款明确禁止仿冒页面） |
| 垃圾 affiliate 词 | `referral` `invite` `bonus` `promo` `code` `hack` `free` `cheapest` | 触发 Google 对 thin-affiliate 的惩罚，且用户天然不信任 |
| 收益承诺词 | `guarantee` `profit` `double` `doubling` `earn-fast` | 触碰「不得承诺收益」红线，涉监管风险 |

**正确定位**：域名应暗示「工具 / 数据 / 比较」，而不是「某个交易所的邀请」。我们的站本质是
Crypto 工具 + 数据站，affiliate 只是后端变现层。

### 2. 命名方向 + 示例

- **方向 A — 品类词 + 工具词**：`CoinHawk` `SwapScope` `ExchangeLens` `FeeFox` `RateRadar` `CoinCompare` `PairLab`
- **方向 B — 抽象品牌词**：`AltcoinHQ` `BlockPulse` `TokenScope` `ChainHub` `MarketLens`

**筛选原则**：≤ 12 字符、易拼写无歧义、无连字符优先（有连字符的 `--` 易输错）、可被商标化（非通用描述词）。

### 2.1 已实测可用的候选（2026-08-11 whois 第三次核查，聚焦「.com + 简短」）

> 用户放弃 .xyz（Google spam 关联）。重点找 .com。结论：简短 .com 几乎被域名投资客/开发者扫光——
> 6–8 字符造词（feenow / feego / ratelab / feehawk / cmpare / coinwiz / feepilot / rateex / feeway / feexly / ratly）全部被占或待售；
> 唯一命中的短 .com 是 **feeeye.com**。

| 候选 | 后缀 | 约价/年 | 字符 | 定位贴合度 | 备注 |
|------|------|--------|------|-----------|------|
| **feeeye.com** | .com | $13.48 | 6 | ★★★★★ | fee(费率)+eye(之眼)——「费率之眼」，最贴费率计算器定位；.com 信任度最高；无同名活跃商标。**首选推荐** |
| **cryptofeetools.com** | .com | $13.48 | 14 | ★★★★ | 描述性长尾，含「crypto fee tools」搜索词，SEO 友好；品牌感弱但零冲突 |
| **exchangefindr.com** | .com | $13.48 | 14 | ★★★★ | `findr` 造词变体贴合「交易所查找器」；好拼写好记 |

**feeeye.com 注意点**：
- 同类竞品 **FeeEdge**（feeedge.com，crypto 费率对比工具）读音相近（Eye/Edge），有轻微混淆风险——但 FeeEdge 体量小、非巨头，且域名与商标均不同。
- crypto 工具圈常见 `-eye` 后缀（ChainEye / DefiEye 等），品牌辨识需靠内容与视觉差异化。

**注意**：以上为 web 同名实体排查，**非正式法律商标检索**。正式注册前请（或让合规顾问）跑一遍 USPTO / EUIPO / WIPO。

### 3. 后缀选择

- `.com` 首选 —— 信任度最高，用户默认联想。
- `.io` —— 开发者 / 工具站友好，品牌感强（近年续费涨价，需注意）。
- `.co` / `.xyz` —— 本项目已放弃 `.xyz`（Google spam 关联）；`.co` 可作 `.com` 替代。
- 避免 `.crypto`（非标准 DNS 解析）与任何明显低质后缀。

### 4. 注册商 + 隐私保护

| 注册商 | 优势 | 备注 |
|-------|------|------|
| **Porkbun** | 价格低、免费 WHOIS 隐私、界面干净 | 推荐 |
| **Namecheap** | 免费 WHOIS 隐私、老牌稳定 | 推荐 |
| **Cloudflare Registrar** | 成本价（仅收注册局费用） | 需把 DNS 托管到 Cloudflare |
| GoDaddy | —— | 不推荐（贵 + 频繁 upsell） |

**必做**：
- 开启 WHOIS 隐私保护（EU 注册商 GDPR 下自动隐藏；US 注册商通常付费提供，Porkbun/Namecheap 免费）。
- 用**独立邮箱 + 独立密码**注册，与日常账号隔离。
- 不要用大陆身份强绑定（参考第三节法务实体建议）。

### 5. 商标前置检查（花 10 分钟，省日后官司）

- 查 **USPTO**（美国）、**EUIPO**（欧盟）、**WIPO** 全球商标库，确认品牌名没被占用。
- 用 **archive.org** 看目标域名历史，避免买到有 spam / 仿冒黑历史的老域名。
- 新注册 .com 首选；若心仪名已被占，换方向 B 抽象词或换后缀。

### 6. 分步注册操作（以 Porkbun 注册 `feeeye.com` 为例）

> 我不能代你注册（需你本人账号 + 付款）。以下是照做的点击级步骤。备选注册商 Namecheap 流程几乎一致。

**步骤 0 — 先定名字**
确认用哪个：推荐 `feeeye.com`（若无特殊偏好就用它）。本文以它举例，换成另外两个同理。

**步骤 1 — 开 Porkbun 账号**
打开 `porkbun.com` → 右上角 **Sign Up** → 用**独立邮箱 + 独立密码**（不要和日常账号混用）→ 验证邮箱。

**步骤 2 — 查域名**
首页搜索框输入 `feeeye.com` → 回车。结果应显示 **AVAILABLE** 与价格（约 $41.88/年）。

**步骤 3 — 加购**
点 **Add to Cart** → 右上角购物车 **Checkout**。

**步骤 4 — 开隐私保护（免费、必开）**
结算页找到 **WHOIS Privacy**，确认已勾选（Porkbun 默认免费开启）。这会把你的注册人信息从公开 WHOIS 隐藏。

**步骤 5 — 选年限**
注册时长建议 **2–3 年**（防忘记续费导致掉牌被抢注；`.io` 近年续费涨价，多年锁定更稳）。

**步骤 6 — 付款**
支持信用卡 / PayPal；Porkbun 也支持部分加密货币。完成付款。

**步骤 7 — 确认状态**
进入 **Dashboard → Domain Manager**，确认 `feeeye.com` 状态为 **Active**（已激活）。

**步骤 8 — 开自动续费**
在 Domain Manager 里把 **Auto-Renew** 打开，避免到期失效。

**步骤 9 — 衔接主机（立刻做）**
注册完成后**不要停在原地**，紧接着把域名 NS 改到 Cloudflare（见第二节）：
- 去 Cloudflare 添加站点 `feeeye.com` → Cloudflare 会给你两个 NS（如 `xxx.ns.cloudflare.com` / `yyy.ns.cloudflare.com`）；
- 回到 Porkbun → Domain Manager → 该域名 → **Edit DNS / Nameservers** → 改为 Cloudflare 给的 NS → Save；
- 等 DNS 生效（几分钟到 24 小时），之后所有流量走 Cloudflare 边缘，方便配 geo-block 与 CDN。

**注册前后的合规校验**
- 注册前：跑 **USPTO / EUIPO / WIPO** 正式商标检索（web 排查 ≠ 法律意见）；用 archive.org 看域名历史（新域名无黑历史风险）。
- 注册后：域名本身不含交易所商标词 / 垃圾 affiliate 词 / 收益承诺词（已在 1. 命名铁律排除）。

> Namecheap 备选：流程同上，注册时在 **WhoisGuard**（免费）处确认开启即可。两者价格接近，Porkbun 略便宜。

---

## 二、主机（海外，且别用阿里云大陆节点）

### 1. 为什么必须海外

- **合规归属清晰**：站点面向 KuCoin 允许地区用户，服务器应在目标市场辖区内或至少海外，
  避免「境内服务器托管面向境外 crypto 推广内容」的监管模糊地带。
- **你现有的阿里云服务器是跑 SATS-Hybrid 量化交易的，和这个营销站是两回事，不要混用**——
  量化执行节点 ≠ 面向公众的营销内容托管。
- 大陆节点还有备案 + 内容监管 + 面向海外高延迟三重问题。

### 2. 我们的站是纯静态（dist/），托管极简

`build/generate.mjs` 产出的是标准静态 HTML，零后端、零数据库、零运行时依赖。
因此托管成本极低，最佳形态是 **对象存储 / 静态托管 + 全球 CDN**。

### 3. 候选（按推荐度）

| 方案 | 适合度 | 说明 |
|-----|-------|------|
| **Cloudflare Pages** | ★★★★★ | 免费、全球 CDN、自动 HTTPS、连 Git 自动部署；AUP 允许 crypto 合规内容（非欺诈/仿冒） |
| **Netlify** | ★★★★★ | 免费层、易用、自动构建、重定向/表单友好 |
| **Vercel** | ★★★★ | 前端框架友好，静态也行；免费层够用 |
| **GitHub Pages** | ★★★ | 免费，自定义域名 + HTTPS 需手动配置 |
| **AWS S3 + CloudFront** | ★★★★ | 可扩展、按量、企业级，配置略重 |
| **VPS（DigitalOcean/Linode/Vultr）** | ★★★ | 想要完全控制或将来加后端/API；$4–6/月 |

> 对本项目，**Cloudflare Pages 或 Netlify** 最省心：连 GitHub 仓库，push 即自动跑
> `node build/generate.mjs` 并部署 dist/。

### 4. DNS + CDN + HTTPS

- 域名 NS 指向 Cloudflare（或注册商默认 NS + Cloudflare proxy 橙色云）。
- 强制 HTTPS（自动 301 跳转 + 免费证书）。
- CDN 顺带隐藏源站 IP、全球加速（对 SEO 与体验都友好）。

### 5. 部署流程（针对本项目）

```bash
# 1. 本地生成静态产物
cd affiliate-site
node build/generate.mjs        # 产出 dist/

# 2. 托管（二选一）
#  A) Cloudflare Pages / Netlify：连 GitHub 仓库，
#     构建命令填 `node build/generate.mjs`，输出目录填 `dist`
#  B) 手动：把 dist/ 整个拖拽 / 上传到托管

# 3. 绑定自定义域名 → 等 DNS 生效（几分钟到几小时）
# 4. 验证：浏览器访问域名，受限地区 IP 应被边缘拦截（见下）
```

### 6. 防御纵深：边缘 geo-block（重要合规兜底）

前端页面已按 `country_availability.js` 过滤 CTA（软过滤），但这是可被绕过的技术层。
**必须在 CDN 边缘再做一层硬拦截**，形成双保险：

- **Cloudflare**：用 **Transform Rules / Workers** 按访客国家（`cf-ipcountry`）对
  CN / HK / US / SG 等 Restricted Locations 的访问直接返回 `403` 或重定向到合规声明页。
- **Netlify**：用 `_redirects` 配合 geo 条件，或 Edge Function 拦截。
- Vercel / AWS 同样有边缘中间件可做。

> 关键：边缘拦截基于**访客 IP 归属国**，比前端 JS 过滤可靠得多，是上线前的硬性合规闸门。

---

## 三、法务实体（一句话提醒）

域名注册与主机付款，建议用一个清晰的**运营实体**（离岸或目标市场公司，如 Estonia e-Residency、
Singapore Pte Ltd、US LLC 等，取决于你的目标市场），不要直接绑个人大陆身份。
**具体结构务必咨询合规顾问**——本指南不提供法律意见。

---

## 四、成本预估

| 项目 | 费用 |
|-----|------|
| 域名 `.com` | ~$10–15 / 年 |
| 静态托管（Cloudflare Pages / Netlify 免费层） | $0 |
| CDN（Cloudflare 免费层） | $0 |
| 边缘 geo-block | $0（规则免费） |
| **合计** | **≈ $15 / 年（起步）** |

规模上来后若超出免费额度，月度成本也通常 < $20。

---

## 五、执行清单（按顺序）

- [ ] 选定 2–3 个候选品牌名 → 查 USPTO/EUIPO/WIPO 商标 → 用 archive.org 看域名历史
- [ ] 在 **Porkbun / Namecheap** 注册 `.com` + 开启 WHOIS 隐私（独立邮箱）
- [ ] 用 **Cloudflare Pages / Netlify** 建站，连 GitHub，构建命令 `node build/generate.mjs`，输出 `dist`
- [ ] 绑定自定义域名，强制 HTTPS
- [ ] 配置**边缘 geo-block**（CN/HK/US/SG 等 → 403 / 合规声明页）
- [ ] 部署 dist/，用 VPN 切不同地区验证：受限地区被拦、合规地区正常 + KuCoin CTA 可见
- [ ] 上线前请合规顾问复核 Terms / 地区限制

---

*本指南为内部执行参考，不构成法律或税务意见。*
