# FeeEye 隐私最小化行为统计方案

## 当前状态（2026-08-27）

- 2026-08-27后台曾确认Cloudflare Web Analytics已启用且排除EU访客；本轮未重新核验后台。Zaraz自定义事件接收端仍未确认启用，两者不可混为一谈。
- 代码已接入 `/assets/analytics.js`：只有 `window.zaraz.track` 存在时才发送白名单事件，否则完全无操作。
- 不设置 FeeEye 用户 ID，不读取 Cookie，不发送金额、钱包地址、持仓、姓名、邮箱或完整搜索词。
- 中英文隐私政策已列出服务商、允许字段和事件范围；Cloudflare 后台启用前后都保持准确。

Cloudflare 官方 API：https://developers.cloudflare.com/zaraz/web-api/track/

## 白名单事件

| 事件 | 触发点 | 允许的业务属性 |
|---|---|---|
| `coin_search_open` | 首页币种搜索第一次获得焦点 | 无 |
| `coin_search_result_open` | 打开搜索结果或精确币种 | `symbol`, `position` |
| `coin_search_no_result` | 主动提交无结果搜索 | `query_length` |
| `tool_interaction` | 工具页第一次有效输入、选择或点击 | `tool` |
| `article_end_view` | 学习文章来源区进入视口 | `article_id` |
| `learn_quiz_open` | 展开一道自测 | `article_id`, `question_number` |
| `learn_tool_open` | 从教程打开相关工具 | `article_id`, `tool` |
| `research_tool_open` | 从原创benchmark打开相关工具 | `benchmark_id`, `tool` |
| `compare_advanced_open` | 第一次展开高风险交易能力 | `pair` |
| `exchange_outbound_open` | 打开已知交易所域名 | `exchange` |

每个事件自动附带：

- `lang`：`en` 或 `zh`
- `page_type`：受控页面类型
- URL中存在时的受控 `utm_source`、`utm_medium`、`utm_campaign`

UTM按渠道与medium配对、活动ID枚举校验。未知值、重复参数、经过清洗才匹配的值全部丢弃。注册表在assets/analytics.js；新增活动必须同步测试。其他查询参数不会发送。

## 明确禁止采集

- 完整搜索词
- 计算器金额和选择结果
- 钱包地址、交易哈希、持仓或盈亏
- IP主动记录、姓名、邮箱、设备指纹
- FeeEye自有用户ID、跨站画像
- 交易所内的注册、KYC、交易或余额数据

## Cloudflare后台启用门槛

1. 确认接收事件的具体分析工具、数据保留周期和地区处理方式。
2. 选择 Preview & Publish，先在调试模式验证事件字段。
3. 检查实际请求中不存在禁止字段。
4. 检查是否新增 Cookie 或本地存储；若与隐私政策不一致，先停用。
5. 正式发布后保存一次事件字段截图或导出作为审计证据。

## 第一阶段指标

- 搜索使用率：`coin_search_open / 首页浏览量`
- 搜索选择率：`coin_search_result_open / coin_search_open`
- 无结果率：`coin_search_no_result / coin_search_open`
- 工具首次互动率（不等于计算成功）：`tool_interaction / 工具页浏览量`
- 来源区可见率（不等于学习完成）：`article_end_view / 学习文章浏览量`
- 教程到工具率：`learn_tool_open / 学习文章浏览量`
- Benchmark到工具率：`research_tool_open / benchmark浏览量`
- 高风险功能兴趣：`compare_advanced_open / 对比页浏览量`
- 交易所出站率：`exchange_outbound_open / 可产生出站的页面浏览量`

运营北极星不是页面浏览量，而是：

> 长期目标是帮助用户完成一次有效任务。目前仅有互动代理指标；任务成功事件与接收端未完成时，完成率标为“未接通”，不估算。

affiliate后台的点击、注册、激活、交易量和佣金单独按周汇总，不与站内匿名事件拼成用户画像。
