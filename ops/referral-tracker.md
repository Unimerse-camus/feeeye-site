# 返佣追踪看板（Referral Tracker）

> 三库之一（返佣追踪库）。补 KPI 仪表盘缺口——把「访问 → 注册 → 激活 → 交易 → 佣金」漏斗的每一层量化，跑正才放大。
> 配套：《Crypto 返佣落地执行手册》第七节 KPI 仪表盘。

---

## 一、为什么必须有这个看板

北极星 = 月活跃交易用户带来的佣金。但佣金是漏斗末端，光看末端会盲。这个看板盯**每一层的转化率**，定位瓶颈：
- 注册少 → 流量/CTA 问题
- 激活少（注册了不交易）→ 钩子/引导问题
- 交易量少（交易了但量小）→ 用户质量/留存问题
- 佣金低（量够但比例低）→ 费率/affiliate 条款问题

---

## 二、日记录字段（每天更新，≤2 分钟）

每行 = 一个渠道在某一天的快照。渠道 = 一个可独立追踪的 tracking link（如 KuCoin affiliate 后台建多条 channel link：seo-where-to-buy / tg-bot / fee-calculator / x-thread）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `date` | YYYY-MM-DD | 日期（UTC） |
| `channel` | string | 渠道标识，如 `seo-where-to-buy`、`tg-bot`、`fee-calc`、`x-thread`、`yt-desc` |
| `platform` | string | 交易所，如 `kucoin`（当前仅 KuCoin，P7 扩多所） |
| `clicks` | int | 链接点击数（affiliate 后台 / 短链统计） |
| `registrations` | int | 注册完成数 |
| `activations` | int | 首笔交易用户数（激活） |
| `trade_volume_usdt` | float | 该渠道用户当日交易量（USDT） |
| `commission_usdt` | float | 当日返佣收入（USDT） |
| `qualified_tasks` | int | 完成工具使用、学习文章或有效比较的聚合次数 |
| `effort_hours` | float | 该渠道当日实际运营投入小时数 |
| `note` | string | 备注（异常、活动、KOL 合作等） |

---

## 三、JSON Schema（程序化读取用）

```json
{
  "records": [
    {
      "date": "2026-08-10",
      "channel": "seo-where-to-buy",
      "platform": "kucoin",
      "clicks": 120,
      "registrations": 3,
      "activations": 1,
      "trade_volume_usdt": 4200.5,
      "commission_usdt": 4.2,
      "qualified_tasks": 18,
      "effort_hours": 1.5,
      "note": ""
    }
  ],
  "meta": {
    "currency": "USDT",
    "affiliate_program": "KuCoin Affiliate (HODL100)",
    "last_updated": "2026-08-10",
    "source": "KuCoin affiliate backend + short-link analytics"
  }
}
```

> 实操：初期手动从 KuCoin affiliate 后台抄数填进 `ops/referral-tracker.json`；规模上来后用 affiliate API（若可用）自动拉取。

---

## 四、周报模板（每周日填，1 小时内）

复制下面表格，填本周聚合数。

### Week of 2026-08-10 ~ 2026-08-16

| 渠道 | 点击 | 注册 | 激活 | 交易量(USDT) | 返佣(USDT) | 注册率 | 激活率 |
|------|------|------|------|-------------|-----------|--------|--------|
| seo-where-to-buy | — | — | — | — | — | —% | —% |
| fee-calc | — | — | — | — | — | —% | —% |
| tg-bot | — | — | — | — | — | —% | —% |
| x-thread | — | — | — | — | — | —% | —% |
| **合计** | **—** | **—** | **—** | **—** | **—** | **—%** | **—%** |

**漏斗转化率（本周）**
- 点击 → 注册率 = 注册 / 点击 = `___%`
- 注册 → 激活率 = 激活 / 注册 = `___%`
- 激活 → 月交易量/人 = `___ USDT`
- 佣金率 = 返佣 / 交易量 = `___%`（对照 affiliate 实际比例核账）
- 有效任务效率 = `qualified_tasks / effort_hours = ___ 次/小时`

> 不使用未经FeeEye自身数据验证的行业“基准”。前4–8周只建立本网站基线；每个渠道至少累计30次访问后，再比较相对效率。

**本周洞察**
- 最高效渠道：___
- 瓶颈层：___（点击/注册/激活/交易/佣金）
- 下周动作：___

---

## 五、月度汇总（原路线图假设，不是预测或行业基准）

| 指标 | 第 1 月目标 | 实际 | 第 3 月目标 | 第 6 月目标 |
|------|-----------|------|-----------|-----------|
| 月 UV | 100–300 | — | 800–2000 | 3000–8000 |
| 月返佣注册 | 1–5 | — | 8–25 | 30–80 |
| 月返佣收入 | $0–20 | — | $50–300 | $300–1500 |

上述数字仅用于早期资源规划，不能作为承诺、行业基准或策略是否成功的单独判断标准；实际决策以FeeEye真实漏斗和投入工时为准。

---

## 六、单位经济自测（跑正才放大）

跑这个公式，三个数都为正才考虑加大渠道投入：

```
LTV = 平均用户生命周期交易量 × 佣金率
CAC = 获取一个激活用户的成本（内容/工具时间折算 + 付费推广）
健康线 = LTV / CAC ≥ 3
```

初期 CAC 几乎为 0（纯 SEO/工具自然流量），所以重点不是省钱，而是**验证漏斗能跑通**：有人来 → 有人用 → 有人点 CTA → 有人注册 → 有人交易 → 有佣金。每一层都有数，这个看板就是干这个的。

---

## 七、合规与数据原则

- 数据真实，不美化； affiliate 后台数为准，短链数为辅。
- 不记录任何用户个人身份信息（PII）——只记聚合数。
- 受限地区（CN/HK/US/SG）的流量因边缘 geo-block 不会进入漏斗，无需追踪。
- 月返佣收入为预估，以交易所实际结算为准。
