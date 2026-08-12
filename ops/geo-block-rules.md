# 边缘 geo-block 规则（Cloudflare WAF）

> 合规闸门（上线前必须配置）。域名在 Cloudflare 转为 Active 后，配置此规则对 Restricted Locations 直接 Block。
> 前端 JS 过滤（软过滤）可被绕过，这层边缘拦截（硬拦截）才是可靠的合规兜底。

---

## 一、受限国家列表

**必拦（种子数据，来自 `data/country_availability.js`）：**
`CN`（中国大陆）、`HK`（中国香港）、`US`（美国）、`SG`（新加坡）

**建议扩展（KuCoin Terms 通常列出的制裁/受限地区，上线前按官方 Restricted Locations 页面核对）：**
`IR`（伊朗）、`KP`（朝鲜）、`CU`（古巴）、`SY`（叙利亚）等

> ⚠️ 列表随 KuCoin Terms 动态变化，**建议每月核对一次**官方 Restricted Locations 页面。

---

## 二、WAF Custom Rule（可粘贴）

**路径**：Cloudflare 控制台 → 选择域名 → **Security → WAF → Custom rules → Create rule**

- **Rule name**: `geo-block-restricted-locations`
- **Expression**（手动选择/输入；**已含合法爬虫白名单**，详见 2.1）:
```
(ip.geoip.country in {"CN" "HK" "US" "SG" "IR" "KP" "CU" "SY"}) and not cf.client.bot
```
- **Action**: `Block`
- 响应代码默认 **403**（可选改成 429 或自定义 403 页面）

> **字段说明**：WAF Custom Rules 用 `ip.geoip.country`（旧版文档里的 `cf-ipcountry` 是 Workers/Transform Rules 的写法，注意别混用）。

### 2.1 关键修正：给合法爬虫白名单（不修站点永远不被 Google 收录）

⚠️ **2026-08-12 发现**：原规则会拦 **Googlebot/Bingbot**（Google 来自美国 IP → 被 403），导致站点永远不会被 Google 收录。**必须加 `cf.client.bot` 排除**。

修正表达式（已含在 2.0 模板里）：

```
(ip.geoip.country in {"CN" "HK" "US" "SG" "IR" "KP" "CU" "SY"}) and not cf.client.bot
```

**可视化构建**（推荐，Cloudflare 表达式编辑器更可读）：
- 条件 1（AND）：Field `Country` → `in` → CN / HK / US / SG / IR / KP / CU / SY
- 条件 2（AND 取反）：Field `Security > cf.client.bot` → `equals` → `true` → **勾选 NOT**
- Action: Block

`cf.client.bot` 是 Cloudflare 验证的合法爬虫（Googlebot、Bingbot、Yandex、Facebook 等），**必须放行**，否则站点无法被收录。

### 2.2 如果已用旧规则上线（务必改！）

1. Cloudflare → **feeeye.com** → Security → WAF → Custom rules
2. 找到 `geo-block-restricted-locations` 规则 → Edit
3. Expression 改为 2.1 修正版
4. Deploy（立即生效）

---

## 三、进阶（可选）：合规声明页

- 简单做法：Block 默认 403 即可（**推荐起步，够用**）。
- 进阶：用 **Transform Rules / Worker** 对受限国家返回 403 + 简短英文合规声明（如 "This service is not available in your region."）。
- 不要给受限地区任何"如何绕过"的信息。

---

## 四、验证（上线后必做）

| 场景 | 期望结果 |
|------|---------|
| VPN 切 US / CN / HK / SG | **403 / 无法访问** |
| VPN 切 DE / BR / JP / TH / NG | 正常打开 + KuCoin CTA 可见 |

> ⚠️ 注意：geoip 基于 VPN 出口 IP 的归属国，可能和你以为的节点不一致，多用几个节点验证。

---

## 五、合规提醒

- 双保险：前端 CTA 隐藏（`country_availability.js`，软过滤）+ 边缘 Block（WAF，硬拦截）。
- geo 判断基于 IP 归属国，非绝对精确（用户可 VPN 绕过），但这是行业标准的"尽力而为"合规姿态。
- 本规则只拦受限地区，不影响合规地区正常访问。
